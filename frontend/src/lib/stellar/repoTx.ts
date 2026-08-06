import {
  rpc,
  Contract,
  TransactionBuilder,
  Networks,
  xdr,
  nativeToScVal,
  Account,
  Asset,
  Operation,
  Horizon,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACTS } from '../../config/contracts';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface CreateRepoParams {
  /** Address of the connected Freighter wallet */
  borrower: string;
  /** XLM amount to deposit (in stroops: 1 XLM = 10_000_000) */
  xlmDepositAmount: number;
  /** Raw Groth16 proof bytes from the ZK prover */
  proofBytes: Uint8Array;
  /** Public signals as strings to preserve BigInt precision */
  publicSignals: string[];
}

export interface RepayParams {
  /** Address of the connected Freighter wallet */
  borrower: string;
  /** Deal ID returned by create_repo_deal */
  dealId: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const RPC_URL = 'https://soroban-testnet.stellar.org';

async function getServer() {
  return new rpc.Server(RPC_URL);
}

async function getAccountAndServer(publicKey: string) {
  const server = await getServer();
  const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  if (!res.ok) {
    throw new Error(
      'Account not found on Testnet. Fund it via https://friendbot.stellar.org first.'
    );
  }
  const data = await res.json();
  const sourceAccount = new Account(publicKey, data.sequence);
  return { server, sourceAccount };
}

async function signAndSubmit(
  server: rpc.Server,
  tx: ReturnType<TransactionBuilder['build']>
): Promise<string> {
  // Sign via Freighter
  const rawXdr = tx.toXDR();
  const signResult = await signTransaction(rawXdr, {
    networkPassphrase: Networks.TESTNET,
  });

  if (signResult.error) {
    throw new Error(`Freighter signing failed: ${String(signResult.error)}`);
  }
  if (!signResult.signedTxXdr) {
    throw new Error('Freighter returned empty XDR. Did you reject the transaction?');
  }

  const signed = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET);
  const sendRes = await server.sendTransaction(signed);

  if (sendRes.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendRes.errorResult)}`);
  }

  // Poll for finality
  const hash = sendRes.hash;
  let attempts = 0;
  while (attempts < 20) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await server.getTransaction(hash);
    if (status.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log('[repoTx] Confirmed:', hash);
      return hash;
    }
    if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Transaction failed on-chain: ${JSON.stringify(status.resultXdr)}`
      );
    }
    attempts++;
    console.log(`[repoTx] Poll ${attempts}: ${status.status}`);
  }
  throw new Error('Transaction timed out. Check Stellar Expert for status.');
}

// ────────────────────────────────────────────────────────────────────────────
// Trustline Setup
// ────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether `publicKey` already has a trustline for the YLDS asset.
 */
export async function hasYldsTrustline(
  publicKey: string,
  yldsIssuer: string
): Promise<boolean> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!res.ok) return false;
    const data = await res.json();
    return (data.balances ?? []).some(
      (b: any) => b.asset_code === 'YLDS' && b.asset_issuer === yldsIssuer
    );
  } catch {
    return false;
  }
}

/**
 * Submits a classic `changeTrust` operation via Freighter so the user
 * can receive YLDS tokens. Returns the transaction hash on success.
 */
export async function setupYldsTrustline(
  publicKey: string,
  yldsIssuer: string
): Promise<string> {
  console.log('[repoTx] Setting up YLDS trustline for:', publicKey);
  const ylds = new Asset('YLDS', yldsIssuer);

  // Classic changeTrust does NOT go through Soroban RPC — use Horizon
  const horizon = new Horizon.Server(HORIZON_URL);
  const acctData = await horizon.loadAccount(publicKey);

  const tx = new TransactionBuilder(acctData, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: ylds, limit: '10000000' }))
    .setTimeout(30)
    .build();

  const rawXdr = tx.toXDR();
  const signResult = await signTransaction(rawXdr, {
    networkPassphrase: Networks.TESTNET,
  });

  if (signResult.error) {
    throw new Error(`Freighter signing failed: ${String(signResult.error)}`);
  }
  if (!signResult.signedTxXdr) {
    throw new Error('Freighter returned empty XDR.');
  }

  const signed = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET);
  const result = await horizon.submitTransaction(signed as any);
  if (!result.successful) {
    throw new Error(`Trustline transaction failed: ${JSON.stringify(result)}`);
  }
  return result.hash;
}

// ────────────────────────────────────────────────────────────────────────────
// Create Repo Deal  (Deposit XLM → Receive YLDS)
// ────────────────────────────────────────────────────────────────────────────

export async function submitCreateRepoDeal(params: CreateRepoParams): Promise<string> {
  const { server, sourceAccount } = await getAccountAndServer(params.borrower);
  const contract = new Contract(CONTRACTS.ASTRA_REPO);

  // Clamp Poseidon public signals to i128 range
  const I128_MAX = BigInt('170141183460469231731687303715884105727');
  const toI128 = (sig: string) => {
    const v = BigInt(sig);
    return v > I128_MAX ? v % I128_MAX : v;
  };

  const publicSignalsScVal = params.publicSignals.map((s) =>
    nativeToScVal(toI128(s), { type: 'i128' })
  );

  const args = [
    nativeToScVal(params.borrower, { type: 'address' }),
    nativeToScVal(BigInt(params.xlmDepositAmount), { type: 'i128' }),
    nativeToScVal(Buffer.from(params.proofBytes), { type: 'bytes' }),
    xdr.ScVal.scvVec(publicSignalsScVal),
  ];

  console.log('[repoTx] Building create_repo_deal call...');
  let tx = new TransactionBuilder(sourceAccount, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call('create_repo_deal', ...args))
    .setTimeout(30)
    .build();

  // Simulate to get resource footprint
  console.log('[repoTx] Simulating...');
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Soroban simulation failed: ${sim.error}`);
  }

  tx = rpc.assembleTransaction(tx, sim).build();
  console.log('[repoTx] Simulation OK. Requesting Freighter signature...');

  return signAndSubmit(server, tx);
}

// ────────────────────────────────────────────────────────────────────────────
// Repay Deal  (Return YLDS → Receive XLM back)
// ────────────────────────────────────────────────────────────────────────────

export async function submitRepayDeal(params: RepayParams): Promise<string> {
  const { server, sourceAccount } = await getAccountAndServer(params.borrower);
  const contract = new Contract(CONTRACTS.ASTRA_REPO);

  const args = [
    nativeToScVal(BigInt(params.dealId), { type: 'u64' }),
    nativeToScVal(params.borrower, { type: 'address' }),
  ];

  console.log('[repoTx] Building repay_and_close call for deal', params.dealId);
  let tx = new TransactionBuilder(sourceAccount, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call('repay_and_close', ...args))
    .setTimeout(30)
    .build();

  console.log('[repoTx] Simulating repayment...');
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Soroban simulation failed: ${sim.error}`);
  }

  tx = rpc.assembleTransaction(tx, sim).build();
  console.log('[repoTx] Simulation OK. Requesting Freighter signature...');

  return signAndSubmit(server, tx);
}
