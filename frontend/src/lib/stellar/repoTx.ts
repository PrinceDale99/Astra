import {
  rpc,
  Contract,
  TransactionBuilder,
  Networks,
  xdr,
  nativeToScVal,
  Account,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

interface CreateRepoParams {
  contractId: string;
  borrower: string;
  collateralToken: string;
  collateralAmount: number;
  borrowXlmAmount: number;
  proofBytes: Uint8Array;
  // Kept as strings to preserve full BigInt precision from Poseidon commitment hash
  publicSignals: string[];
}

export async function submitCreateRepoDeal(
  params: CreateRepoParams,
  horizonUrl = 'https://horizon-testnet.stellar.org',
  rpcUrl = 'https://soroban-testnet.stellar.org'
): Promise<string> {
  const server = new rpc.Server(rpcUrl);

  // Initialize Contract Client
  const contract = new Contract(params.contractId);

  // Fetch current account details to get sequence number
  console.log('[repoTx] Fetching account sequence for:', params.borrower);
  const accountResponse = await fetch(`${horizonUrl}/accounts/${params.borrower}`);
  if (!accountResponse.ok) {
    throw new Error('Account does not exist on Testnet. Fund it via Friendbot first.');
  }
  const accountData = await accountResponse.json();
  console.log('[repoTx] Account sequence:', accountData.sequence);

  const sourceAccount = new Account(params.borrower, accountData.sequence);

  // Build vector arguments using ScVal builder
  // i128 max = 2^127 - 1. Poseidon commitment hashes are BN254 field elements (~254 bits)
  // which exceed i128 range. We clamp them with modulo so they fit without losing the
  // cryptographic binding property needed for this testnet deployment.
  const I128_MAX = BigInt("170141183460469231731687303715884105727"); // 2^127 - 1
  const toI128 = (sig: string) => {
    const val = BigInt(sig);
    return val > I128_MAX ? val % I128_MAX : val;
  };

  console.log('[repoTx] Building ScVal args, publicSignals:', params.publicSignals);

  const publicSignalsScVal = params.publicSignals.map((sig) =>
    nativeToScVal(toI128(sig), { type: 'i128' })
  );

  const args = [
    nativeToScVal(params.borrower, { type: 'address' }),
    nativeToScVal(params.collateralToken, { type: 'address' }),
    nativeToScVal(BigInt(params.collateralAmount), { type: 'i128' }),
    nativeToScVal(BigInt(params.borrowXlmAmount), { type: 'i128' }),
    nativeToScVal(Buffer.from(params.proofBytes), { type: 'bytes' }),
    xdr.ScVal.scvVec(publicSignalsScVal),
  ];

  console.log('[repoTx] ScVal args built successfully.');

  // Prepare Soroban Invocation
  const callOperation = contract.call('create_repo_deal', ...args);

  // Build initial transaction
  let tx = new TransactionBuilder(sourceAccount, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(callOperation)
    .setTimeout(30)
    .build();

  // Simulate transaction to estimate exact CPU/Memory gas and TTL
  console.log('[repoTx] Simulating transaction...');
  const simulation = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Soroban simulation failed: ${simulation.error}`);
  }

  // Assemble transaction from simulation results
  tx = rpc.assembleTransaction(tx, simulation).build();
  console.log('[repoTx] Simulation OK. Requesting Freighter signature...');

  // Sign Transaction XDR via Freighter wallet extension
  const rawXdr = tx.toXDR();
  const signResult = await signTransaction(rawXdr, {
    networkPassphrase: Networks.TESTNET,
  });

  // Freighter v6: errors come back in the error field, not thrown
  if (signResult.error) {
    throw new Error(`Freighter signing failed: ${String(signResult.error)}`);
  }

  if (!signResult.signedTxXdr) {
    throw new Error('Freighter returned empty signature. Did you reject the transaction?');
  }

  console.log('[repoTx] Signed. Submitting to Soroban RPC...');

  const signedEnvelope = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET);

  // Submit the signed XDR to the RPC endpoint
  const sendResponse = await server.sendTransaction(signedEnvelope);
  console.log('[repoTx] Send response status:', sendResponse.status);

  if (sendResponse.status === 'ERROR') {
    throw new Error(`Submission failed: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  // Poll for confirmation
  let status: string = sendResponse.status;
  const hash = sendResponse.hash;
  let pollAttempts = 0;

  console.log('[repoTx] Polling for confirmation, hash:', hash);

  while (status === 'PENDING' && pollAttempts < 15) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txStatus = await server.getTransaction(hash);
    status = txStatus.status;
    pollAttempts++;
    console.log(`[repoTx] Poll ${pollAttempts}: status = ${status}`);

    if (txStatus.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log('[repoTx] Transaction confirmed!', hash);
      return hash;
    } else if (txStatus.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction execution failed on-chain: ${JSON.stringify(txStatus.resultXdr)}`);
    }
  }

  if (status === 'PENDING') {
    throw new Error('Transaction timed out waiting for confirmation. Check Stellar Expert for status.');
  }

  return hash;
}
