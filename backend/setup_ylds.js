/**
 * setup_ylds.js
 *
 * One-time setup script that:
 * 1. Generates a fresh YLDS issuer keypair (save the secret!)
 * 2. Creates a distributor keypair
 * 3. Creates a trustline from distributor ? issuer
 * 4. Issues 3,000,000 YLDS to the distributor (classic payment)
 * 5. Transfers 3,000,000 YLDS to the AstraRepo contract via the YLDS SAC
 *
 * Usage:
 *   node setup_ylds.js
 *
 * Output: prints the new YLDS SAC contract ID and issuer secret key.
 *         Update frontend/src/config/contracts.ts with the new SAC ID.
 */

const {
  Keypair,
  Asset,
  Horizon,
  rpc,
  TransactionBuilder,
  Networks,
  Account,
  Operation,
  nativeToScVal,
  Contract,
} = require('@stellar/stellar-sdk');

const REPO_CONTRACT_ID = 'CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_URL = 'https://soroban-testnet.stellar.org';
const NETWORK = Networks.TESTNET;
const YLDS_AMOUNT = 3_000_000; // 3 million
const YLDS_STROOPS = BigInt(YLDS_AMOUNT) * BigInt(10_000_000); // 7 decimals

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollTx(server, hash) {
  for (let i = 0; i < 20; i++) {
    const status = await server.getTransaction(hash);
    if (status.status === 'SUCCESS') return status;
    if (status.status === 'FAILED') throw new Error(`Tx failed: ${JSON.stringify(status)}`);
    await sleep(2000);
  }
  throw new Error(`Tx ${hash} timed out`);
}

async function main() {
  const horizon = new Horizon.Server(HORIZON_URL);
  const soroban = new rpc.Server(SOROBAN_URL);

  // --- Step 1: Generate keypairs --------------------------------------------
  const issuer = Keypair.random();
  const distributor = Keypair.random();
  const ylds = new Asset('YLDS', issuer.publicKey());
  const yldsSacId = ylds.contractId(NETWORK);

  console.log('\n+------------------------------------------------------+');
  console.log('�  Astra YLDS Setup Script                             �');
  console.log('+------------------------------------------------------+');
  console.log(`\nIssuer Public:      ${issuer.publicKey()}`);
  console.log(`Issuer Secret:      ${issuer.secret()} ? SAVE THIS`);
  console.log(`Distributor Public: ${distributor.publicKey()}`);
  console.log(`YLDS SAC ID:        ${yldsSacId}`);
  console.log(`\nFunding accounts via Friendbot...`);

  // --- Step 2: Fund issuer and distributor via Friendbot --------------------
  await Promise.all([
    fetch(`https://friendbot.stellar.org/?addr=${issuer.publicKey()}`).then((r) => r.json()),
    fetch(`https://friendbot.stellar.org/?addr=${distributor.publicKey()}`).then((r) => r.json()),
  ]);
  await sleep(3000); // wait for Horizon to index

  // --- Step 3: Distributor creates trustline for YLDS ----------------------
  console.log('\nCreating YLDS trustline for distributor...');
  let distAcct = await horizon.loadAccount(distributor.publicKey());
  let trustTx = new TransactionBuilder(distAcct, { fee: '100000', networkPassphrase: NETWORK })
    .addOperation(Operation.changeTrust({ asset: ylds, limit: String(YLDS_AMOUNT + 1_000_000) }))
    .setTimeout(30)
    .build();
  trustTx.sign(distributor);
  const trustResult = await horizon.submitTransaction(trustTx);
  if (!trustResult.successful) throw new Error('Trustline creation failed');
  console.log('  ? Trustline created');
  await sleep(3000);

  // --- Step 4: Issuer mints 3M YLDS to distributor -------------------------
  console.log(`\nMinting ${YLDS_AMOUNT.toLocaleString()} YLDS to distributor...`);
  const issuerAcct = await horizon.loadAccount(issuer.publicKey());
  let mintTx = new TransactionBuilder(issuerAcct, { fee: '100000', networkPassphrase: NETWORK })
    .addOperation(
      Operation.payment({
        destination: distributor.publicKey(),
        asset: ylds,
        amount: String(YLDS_AMOUNT),
      })
    )
    .setTimeout(30)
    .build();
  mintTx.sign(issuer);
  const mintResult = await horizon.submitTransaction(mintTx);
  if (!mintResult.successful) throw new Error('Minting failed');
  console.log(`  ? ${YLDS_AMOUNT.toLocaleString()} YLDS minted to distributor`);
  await sleep(3000);

  // --- Step 5: Distributor transfers 3M YLDS to AstraRepo contract ----------
  // Classic assets cannot be sent to a contract address via classic `payment`.
  // Must use the SAC's `transfer` function (a Soroban invocation).
  console.log(`\nTransferring ${YLDS_AMOUNT.toLocaleString()} YLDS to AstraRepo contract via SAC...`);
  const sacContract = new Contract(yldsSacId);
  let distAcct2 = await horizon.loadAccount(distributor.publicKey());
  const sourceAccount = new Account(distributor.publicKey(), distAcct2.sequence);

  const fromScVal = nativeToScVal(distributor.publicKey(), { type: 'address' });
  const toScVal = nativeToScVal(REPO_CONTRACT_ID, { type: 'address' });
  const amountScVal = nativeToScVal(YLDS_STROOPS, { type: 'i128' });

  let sacTx = new TransactionBuilder(sourceAccount, { fee: '100000', networkPassphrase: NETWORK })
    .addOperation(sacContract.call('transfer', fromScVal, toScVal, amountScVal))
    .setTimeout(30)
    .build();

  const sim = await soroban.simulateTransaction(sacTx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`SAC simulation failed: ${sim.error}`);
  }

  sacTx = rpc.assembleTransaction(sacTx, sim).build();
  sacTx.sign(distributor);

  const sendRes = await soroban.sendTransaction(sacTx);
  if (sendRes.status === 'ERROR') throw new Error(`SAC send failed: ${JSON.stringify(sendRes)}`);

  console.log(`  Waiting for confirmation (hash: ${sendRes.hash})...`);
  await pollTx(soroban, sendRes.hash);
  console.log(`  ? ${YLDS_AMOUNT.toLocaleString()} YLDS delivered to AstraRepo contract`);

  // --- Summary --------------------------------------------------------------
  console.log('\n+------------------------------------------------------+');
  console.log('�  Setup Complete! Update your config with:            �');
  console.log('+------------------------------------------------------+');
  console.log(`\nYLDS_SAC_ID  = "${yldsSacId}"`);
  console.log(`ISSUER_KEY   = "${issuer.publicKey()}"`);
  console.log(`ISSUER_SECRET= "${issuer.secret()}" ? store in .env`);
  console.log(`\nUpdate frontend/src/config/contracts.ts ? YLDS_SAC_CONTRACT_ID`);
  console.log(`Then re-initialize (or re-deploy) the AstraRepo contract`);
  console.log(`with the new YLDS SAC address.\n`);
}

main().catch((err) => {
  console.error('\n? Setup failed:', err.message || err);
  process.exit(1);
});
