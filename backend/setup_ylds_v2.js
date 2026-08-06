/**
 * setup_ylds_v2.js
 *
 * Full YLDS setup using the new YLDS asset created by the previous run:
 * Issuer:       GDWVUZ6W6WTJUTCM23LXZYU63D7D5PKHXZIQ3BMTNYN5KLFDH7NIJOZC
 * Secret:       SBXCMEHHQOMHRJJCNMIAWWY4SC6K5NYI64Z274FH6LJFVFPXLAZL4L4C
 * Distributor:  GDMOG6J75UVEK7Y3AVZ3RSBNX5A4PIDW7J4EJ7BAVHSUPFVFU7RLMFFG (has 3M YLDS)
 * YLDS SAC ID:  CBT2FAHTV57M4LFZREZNOU7XYQQZWKX3GKCF3RGVX7DJVYNFOVJ3TFVT
 *
 * Steps:
 *   1. Deploy the YLDS SAC instance on Soroban (registers it as a contract)
 *   2. Transfer 3M YLDS from distributor to the NEW AstraRepo contract
 */

const {
  Keypair,
  Asset,
  Horizon,
  rpc,
  TransactionBuilder,
  Networks,
  Account,
  nativeToScVal,
  Contract,
  xdr,
  StrKey,
} = require('@stellar/stellar-sdk');

// ─── Config from previous setup_ylds.js run ──────────────────────────────────
const ISSUER_SECRET = 'SBXCMEHHQOMHRJJCNMIAWWY4SC6K5NYI64Z274FH6LJFVFPXLAZL4L4C';
const DISTRIBUTOR_PUB = 'GDMOG6J75UVEK7Y3AVZ3RSBNX5A4PIDW7J4EJ7BAVHSUPFVFU7RLMFFG';
const YLDS_SAC_ID = 'CBT2FAHTV57M4LFZREZNOU7XYQQZWKX3GKCF3RGVX7DJVYNFOVJ3TFVT';

// ─── Target: NEW AstraRepo contract (will be set after deploy_contract.js runs) ─
// For now, we fund the existing contract; update once re-deployed.
const TARGET_CONTRACT = process.argv[2] || 'CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_URL = 'https://soroban-testnet.stellar.org';
const NETWORK = Networks.TESTNET;
const YLDS_STROOPS = BigInt(3_000_000) * BigInt(10_000_000); // 3M YLDS

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollTx(server, hash) {
  process.stdout.write('  Waiting');
  for (let i = 0; i < 30; i++) {
    const status = await server.getTransaction(hash);
    if (status.status === 'SUCCESS') { process.stdout.write(' ✅\n'); return status; }
    if (status.status === 'FAILED') { throw new Error('Tx FAILED: ' + JSON.stringify(status)); }
    process.stdout.write('.');
    await sleep(2000);
  }
  throw new Error('Timed out: ' + hash);
}

async function main() {
  const horizon = new Horizon.Server(HORIZON_URL);
  const soroban = new rpc.Server(SOROBAN_URL);

  const issuer = Keypair.fromSecret(ISSUER_SECRET);
  const ylds = new Asset('YLDS', issuer.publicKey());

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  YLDS SAC Deploy & Fund                              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nIssuer:      ${issuer.publicKey()}`);
  console.log(`YLDS SAC:    ${YLDS_SAC_ID}`);
  console.log(`Target:      ${TARGET_CONTRACT}`);

  // ─── Step 1: Deploy the YLDS SAC ─────────────────────────────────────────
  console.log('\n[1/2] Deploying YLDS SAC on Soroban...');
  const issuerAcct = await horizon.loadAccount(issuer.publicKey());
  let sourceAccount = new Account(issuer.publicKey(), issuerAcct.sequence);

  // Build the createContract operation for a Stellar asset SAC
  const deploySacOp = xdr.Operation.fromXDR(
    new xdr.Operation({
      sourceAccount: null,
      body: xdr.OperationBody.invokeHostFunction(
        new xdr.InvokeHostFunctionOp({
          hostFunction: xdr.HostFunction.hostFunctionTypeCreateContract(
            new xdr.CreateContractArgs({
              contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(
                ylds.toXDRObject()
              ),
              executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
            })
          ),
          auth: [],
        })
      ),
    }).toXDR(),
    'raw'
  );

  let deployTx = new TransactionBuilder(sourceAccount, {
    fee: '1000000',
    networkPassphrase: NETWORK,
  })
    .addOperation(deploySacOp)
    .setTimeout(60)
    .build();

  const simDeploy = await soroban.simulateTransaction(deployTx);
  if (rpc.Api.isSimulationError(simDeploy)) {
    // SAC might already be deployed — that's fine, continue
    if (simDeploy.error.includes('already exists') || simDeploy.error.includes('AlreadyExists')) {
      console.log('  ℹ️  SAC already deployed, skipping...');
    } else {
      throw new Error('SAC deploy simulation failed: ' + simDeploy.error);
    }
  } else {
    deployTx = rpc.assembleTransaction(deployTx, simDeploy).build();
    deployTx.sign(issuer);
    const deployRes = await soroban.sendTransaction(deployTx);
    if (deployRes.status === 'ERROR') {
      throw new Error('SAC deploy send failed: ' + JSON.stringify(deployRes));
    }
    await pollTx(soroban, deployRes.hash);
    console.log('  ✅ YLDS SAC deployed on Soroban');
    await sleep(3000);
  }

  // ─── Step 2: Transfer 3M YLDS from distributor to target contract ─────────
  console.log(`\n[2/2] Sending 3,000,000 YLDS to ${TARGET_CONTRACT}...`);

  // We need the distributor keypair. In this case, the distributor account still
  // holds the 3M YLDS. We need to use their secret key.
  // Since setup_ylds.js generated a random distributor, we need to re-run from issuer.
  // Solution: mint 3M MORE from issuer directly via the SAC's `mint` function.
  // The issuer controls the SAC admin (since they control the classic asset).
  
  const issuerAcct2 = await horizon.loadAccount(issuer.publicKey());
  sourceAccount = new Account(issuer.publicKey(), issuerAcct2.sequence);

  const sacContract = new Contract(YLDS_SAC_ID);
  
  // Use `mint` (issuer = admin of SAC) to mint directly to the target contract
  const toScVal = nativeToScVal(TARGET_CONTRACT, { type: 'address' });
  const amountScVal = nativeToScVal(YLDS_STROOPS, { type: 'i128' });

  let mintTx = new TransactionBuilder(sourceAccount, {
    fee: '1000000',
    networkPassphrase: NETWORK,
  })
    .addOperation(sacContract.call('mint', toScVal, amountScVal))
    .setTimeout(60)
    .build();

  const simMint = await soroban.simulateTransaction(mintTx);
  if (rpc.Api.isSimulationError(simMint)) {
    throw new Error('Mint simulation failed: ' + simMint.error);
  }

  mintTx = rpc.assembleTransaction(mintTx, simMint).build();
  mintTx.sign(issuer);

  const mintRes = await soroban.sendTransaction(mintTx);
  if (mintRes.status === 'ERROR') {
    throw new Error('Mint send failed: ' + JSON.stringify(mintRes));
  }
  await pollTx(soroban, mintRes.hash);
  console.log('\n  ✅ 3,000,000 YLDS minted to contract!');

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Done!                                               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nYLDS_SAC_ID   = "${YLDS_SAC_ID}"`);
  console.log(`YLDS_ISSUER   = "${issuer.publicKey()}"`);
  console.log(`YLDS_ISSUER_SECRET = "${ISSUER_SECRET}"`);
  console.log(`\nAdd these to your Render backend environment variables.`);
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
