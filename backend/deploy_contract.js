/**
 * deploy_contract.js
 *
 * Deploys the new AstraRepo Wasm to testnet and initializes it with:
 *   - Native XLM SAC
 *   - YLDS SAC (provided by env var or argument)
 *
 * Usage:
 *   node deploy_contract.js <YLDS_SAC_ID> <YLDS_ISSUER_SECRET>
 *
 * Or set env vars:
 *   YLDS_SAC_ID=C... YLDS_ISSUER_SECRET=S... node deploy_contract.js
 */

const {
  Keypair,
  rpc,
  TransactionBuilder,
  Networks,
  Account,
  Contract,
  nativeToScVal,
  xdr,
  StrKey,
} = require('@stellar/stellar-sdk');
const fs = require('fs');
const path = require('path');

const NATIVE_XLM_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_URL = 'https://soroban-testnet.stellar.org';
const NETWORK = Networks.TESTNET;
const WASM_PATH = path.join(
  __dirname,
  '../contracts/astra_repo/target/wasm32v1-none/release/astra_repo.wasm'
);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollTx(server, hash) {
  for (let i = 0; i < 30; i++) {
    const status = await server.getTransaction(hash);
    if (status.status === 'SUCCESS') return status;
    if (status.status === 'FAILED') throw new Error(`Tx FAILED: ${JSON.stringify(status)}`);
    process.stdout.write('.');
    await sleep(2000);
  }
  throw new Error('Timed out waiting for tx ' + hash);
}

async function main() {
  const yldsSacId = process.argv[2] || process.env.YLDS_SAC_ID;
  const deployerSecret = process.argv[3] || process.env.DEPLOYER_SECRET;

  if (!yldsSacId) {
    console.error('Usage: node deploy_contract.js <YLDS_SAC_ID> [DEPLOYER_SECRET]');
    console.error('  YLDS_SAC_ID  — the contract ID of the YLDS SAC (run setup_ylds.js first)');
    process.exit(1);
  }

  const server = new rpc.Server(SOROBAN_URL);

  // Use provided deployer secret or generate a fresh funded account
  let deployer;
  if (deployerSecret) {
    deployer = Keypair.fromSecret(deployerSecret);
    console.log('Using provided deployer:', deployer.publicKey());
  } else {
    deployer = Keypair.random();
    console.log('Generated deployer:', deployer.publicKey());
    console.log('Funding via Friendbot...');
    const fb = await fetch(`https://friendbot.stellar.org/?addr=${deployer.publicKey()}`);
    if (!fb.ok) throw new Error('Friendbot failed: ' + await fb.text());
    await sleep(4000);
  }

  // Load deployer account info
  const acctData = await (await fetch(`${HORIZON_URL}/accounts/${deployer.publicKey()}`)).json();
  let sourceAccount = new Account(deployer.publicKey(), acctData.sequence);

  console.log('\n[1/3] Uploading Wasm...');
  const wasmBytes = fs.readFileSync(WASM_PATH);
  const uploadOp = xdr.Operation.fromXDR(
    xdr.OperationBody.invokeHostFunction({
      hostFunction: xdr.HostFunction.hostFunctionTypeUploadContractWasm(
        Buffer.from(wasmBytes)
      ),
      auth: [],
    }).toXDR(),
    'raw'
  );

  // Build via TransactionBuilder (simpler: use soroban CLI style)
  // Use the SDK's Operation.invokeHostFunction if available, else fall back to raw XDR
  // The cleanest approach: use soroban CLI for upload
  console.log('  Note: Using stellar-sdk uploadContractWasm via raw XDR...');

  let uploadTx = new TransactionBuilder(sourceAccount, {
    fee: '1000000',
    networkPassphrase: NETWORK,
  })
    .addOperation(
      xdr.Operation.fromXDR(
        new xdr.Operation({
          sourceAccount: null,
          body: xdr.OperationBody.invokeHostFunction(
            new xdr.InvokeHostFunctionOp({
              hostFunction: xdr.HostFunction.hostFunctionTypeUploadContractWasm(
                Buffer.from(wasmBytes)
              ),
              auth: [],
            })
          ),
        }).toXDR(),
        'raw'
      )
    )
    .setTimeout(60)
    .build();

  const simUpload = await server.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(simUpload)) {
    throw new Error('Upload simulation failed: ' + simUpload.error);
  }

  uploadTx = rpc.assembleTransaction(uploadTx, simUpload).build();
  uploadTx.sign(deployer);

  const uploadRes = await server.sendTransaction(uploadTx);
  console.log('\n  Waiting for upload confirmation...');
  const uploadStatus = await pollTx(server, uploadRes.hash);
  
  // Extract Wasm hash from result
  const wasmHash = uploadStatus.returnValue?.bytes();
  if (!wasmHash) throw new Error('Could not extract Wasm hash from upload result');
  console.log('\n  ✅ Wasm uploaded. Hash:', Buffer.from(wasmHash).toString('hex'));

  // Refresh sequence
  const acctData2 = await (await fetch(`${HORIZON_URL}/accounts/${deployer.publicKey()}`)).json();
  sourceAccount = new Account(deployer.publicKey(), acctData2.sequence);

  console.log('\n[2/3] Deploying contract instance...');
  const deployTx = new TransactionBuilder(sourceAccount, {
    fee: '1000000',
    networkPassphrase: NETWORK,
  })
    .addOperation(
      xdr.Operation.fromXDR(
        new xdr.Operation({
          sourceAccount: null,
          body: xdr.OperationBody.invokeHostFunction(
            new xdr.InvokeHostFunctionOp({
              hostFunction: xdr.HostFunction.hostFunctionTypeCreateContract(
                new xdr.CreateContractArgs({
                  contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
                    new xdr.ContractIdPreimageFromAddress({
                      address: xdr.ScAddress.scAddressTypeAccount(
                        xdr.AccountId.publicKeyTypeEd25519(deployer.rawPublicKey())
                      ),
                      salt: Buffer.alloc(32, Math.floor(Math.random() * 256)),
                    })
                  ),
                  executable: xdr.ContractExecutable.contractExecutableWasm(
                    Buffer.from(wasmHash)
                  ),
                })
              ),
              auth: [],
            })
          ),
        }).toXDR(),
        'raw'
      )
    )
    .setTimeout(60)
    .build();

  const simDeploy = await server.simulateTransaction(deployTx);
  if (rpc.Api.isSimulationError(simDeploy)) {
    throw new Error('Deploy simulation failed: ' + simDeploy.error);
  }

  const asmDeployTx = rpc.assembleTransaction(deployTx, simDeploy).build();
  asmDeployTx.sign(deployer);

  const deployRes = await server.sendTransaction(asmDeployTx);
  console.log('\n  Waiting for deploy confirmation...');
  const deployStatus = await pollTx(server, deployRes.hash);

  // Extract new contract ID from result
  const contractIdBytes = deployStatus.returnValue?.address()?.contractId();
  if (!contractIdBytes) throw new Error('Could not extract contract ID from deploy result');
  const contractId = StrKey.encodeContract(contractIdBytes);
  console.log('\n  ✅ Contract deployed:', contractId);

  // Refresh sequence
  const acctData3 = await (await fetch(`${HORIZON_URL}/accounts/${deployer.publicKey()}`)).json();
  sourceAccount = new Account(deployer.publicKey(), acctData3.sequence);

  console.log('\n[3/3] Initializing contract...');
  const contract = new Contract(contractId);
  const initArgs = [
    nativeToScVal(deployer.publicKey(), { type: 'address' }),
    nativeToScVal(NATIVE_XLM_SAC, { type: 'address' }),
    nativeToScVal(yldsSacId, { type: 'address' }),
  ];

  let initTx = new TransactionBuilder(sourceAccount, {
    fee: '1000000',
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call('initialize', ...initArgs))
    .setTimeout(60)
    .build();

  const simInit = await server.simulateTransaction(initTx);
  if (rpc.Api.isSimulationError(simInit)) {
    throw new Error('Init simulation failed: ' + simInit.error);
  }

  initTx = rpc.assembleTransaction(initTx, simInit).build();
  initTx.sign(deployer);

  const initRes = await server.sendTransaction(initTx);
  console.log('\n  Waiting for init confirmation...');
  await pollTx(server, initRes.hash);
  console.log('\n  ✅ Contract initialized');

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Deployment Complete!                                ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nNew Contract ID: ${contractId}`);
  console.log(`YLDS SAC ID:     ${yldsSacId}`);
  console.log(`\nUpdate the following in frontend/src/config/contracts.ts:`);
  console.log(`  ASTRA_REPO: "${contractId}"`);
  console.log(`\nAnd the /api/v1/config backend endpoint with the YLDS issuer.`);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
