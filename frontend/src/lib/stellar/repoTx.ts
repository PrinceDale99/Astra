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
  publicSignals: number[];
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
  const accountResponse = await fetch(`${horizonUrl}/accounts/${params.borrower}`);
  if (!accountResponse.ok) {
    throw new Error('Account does not exist on Testnet. Fund it first using Friendbot.');
  }
  const accountData = await accountResponse.json();
  
  // Account is a direct export in newer SDKs
  const sourceAccount = new Account(
    params.borrower,
    accountData.sequence
  );

  // Build vector arguments using ScVal builder
  const publicSignalsScVal = params.publicSignals.map((sig) => 
    nativeToScVal(BigInt(sig), { type: 'i128' })
  );

  const args = [
    nativeToScVal(params.borrower, { type: 'address' }),
    nativeToScVal(params.collateralToken, { type: 'address' }),
    nativeToScVal(BigInt(params.collateralAmount), { type: 'i128' }),
    nativeToScVal(BigInt(params.borrowXlmAmount), { type: 'i128' }),
    nativeToScVal(Buffer.from(params.proofBytes), { type: 'bytes' }),
    xdr.ScVal.scvVec(publicSignalsScVal),
  ];

  // Prepare Soroban Invocation
  const callOperation = contract.call('create_repo_deal', ...args);

  // Build initial transaction
  let tx = new TransactionBuilder(sourceAccount, {
    fee: '100000', // Baseline starting fee
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(callOperation)
    .setTimeout(30)
    .build();

  // Simulate transaction to estimate exact CPU/Memory gas and rent/TTL extensions
  const simulation = await server.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }

  // Assemble transaction from simulation results (updating footprint and resource limits)
  tx = rpc.assembleTransaction(tx, simulation).build();

  // Sign Transaction XDR via Freighter wallet extension
  const rawXdr = tx.toXDR();
  const signResult = await signTransaction(rawXdr, {
    networkPassphrase: Networks.TESTNET,
  });

  if (signResult.error) {
    throw new Error(`Freighter signing failed: ${signResult.error}`);
  }

  const signedEnvelope = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET);

  // Submit the signed XDR to the RPC endpoint
  const sendResponse = await server.sendTransaction(signedEnvelope);

  if (sendResponse.status === 'ERROR') {
    throw new Error(`Submission failed: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  // Poll for status confirmation
  let status: string = sendResponse.status;
  let hash = sendResponse.hash;
  let pollAttempts = 0;

  while (status === 'PENDING' && pollAttempts < 10) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txStatus = await server.getTransaction(hash);
    status = txStatus.status;
    pollAttempts++;

    if (txStatus.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    } else if (txStatus.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction execution failed: ${JSON.stringify(txStatus.resultXdr)}`);
    }
  }

  if (status === 'PENDING') {
    throw new Error('Transaction execution timed out.');
  }

  return hash;
}
