const { Keypair, rpc, TransactionBuilder, Networks, Operation, Address, xdr, Contract, nativeToScVal } = require('@stellar/stellar-sdk');
const fs = require('fs');

const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';
const WASM_HASH = 'e0847be23d4d7f71c476338eb016d4b0a6d2b7181fe5a45ae211f98aefc6fd17';

const NATIVE_XLM_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const YLDS_SAC_ID = 'CBT2FAHTV57M4LFZREZNOU7XYQQZWKX3GKCF3RGVX7DJVYNFOVJ3TFVT';

async function main() {
  const server = new rpc.Server(RPC_URL);
  const deployerSecret = 'SANESKUCL6HYCVVMZF7MSNEI5HC3TZAWZJOZEGO5R2WWFPBMGMXCZC6U';
  const adminSecret = 'SDQXA5OBR2GCDB5R2FXMN2GEUYYP32PS5D3LGOJ5UHT6DRJWDPSIIWLR';
  
  const deployerKeypair = Keypair.fromSecret(deployerSecret);
  const adminKeypair = Keypair.fromSecret(adminSecret);

  const deployerAccount = await server.getAccount(deployerKeypair.publicKey());
  
  // 1. Deploy
  const deployTx = new TransactionBuilder(deployerAccount, { fee: '1000000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      Operation.createCustomContract({
        address: new Address(deployerKeypair.publicKey()),
        wasmHash: Buffer.from(WASM_HASH, 'hex'),
        salt: Buffer.alloc(32, 'astra_v3_' + Date.now()),
      })
    ).setTimeout(300).build();
    
  let simResult = await server.simulateTransaction(deployTx);
  let preparedDeploy = rpc.assembleTransaction(deployTx, simResult).build();
  preparedDeploy.sign(deployerKeypair);
  
  let sendResult = await server.sendTransaction(preparedDeploy);
  
  let contractId = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await server.getTransaction(sendResult.hash);
    if (status.status === 'SUCCESS') {
        const meta = xdr.TransactionMeta.fromXDR(status.resultMetaXdr, 'base64');
        const ops = meta.v3?.operations?.() || [];
        for (const op of ops) {
          for (const change of (op.changes?.() || [])) {
            try {
              const lk = change.created?.()?.data?.()?.contractData?.()?.contract?.();
              if (lk) { contractId = new Address(lk).toString(); break; }
            } catch {}
          }
        }
        break;
    }
  }

  if (!contractId) { console.error("Could not deploy"); return; }
  console.log("Deployed:", contractId);

  // 2. Initialize
  const adminAccount = await server.getAccount(adminKeypair.publicKey());
  const contract = new Contract(contractId);
  const initTx = new TransactionBuilder(adminAccount, { fee: '100000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(
      'initialize',
      nativeToScVal(adminKeypair.publicKey(), { type: 'address' }),
      nativeToScVal(NATIVE_XLM_SAC, { type: 'address' }),
      nativeToScVal(YLDS_SAC_ID, { type: 'address' }),
    )).setTimeout(300).build();

  const simInit = await server.simulateTransaction(initTx);
  const preparedInit = rpc.assembleTransaction(initTx, simInit).build();
  preparedInit.sign(adminKeypair);
  const initSend = await server.sendTransaction(preparedInit);
  
  let successInit = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await server.getTransaction(initSend.hash);
    if (status.status === 'SUCCESS') { successInit = true; break; }
  }
  
  if (successInit) {
    console.log("INITIALIZED_SUCCESS");
    fs.writeFileSync('NEW_CONTRACT_ID.txt', contractId);
  } else {
    console.log("FAILED TO INITIALIZE");
  }
}
main();
