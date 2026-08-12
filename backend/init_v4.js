const { Keypair, rpc, TransactionBuilder, Networks, Account, Contract, nativeToScVal } = require('@stellar/stellar-sdk');

const CONTRACT_ID = 'CBEFDURITQZCTGZ4UWHONPDYRILH7Y4KOQD5IHYSSQSTZMFFSERMWUW3';
const NATIVE_XLM_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const YLDS_SAC_ID = 'CBT2FAHTV57M4LFZREZNOU7XYQQZWKX3GKCF3RGVX7DJVYNFOVJ3TFVT';
const ADMIN_SECRET = 'SDQXA5OBR2GCDB5R2FXMN2GEUYYP32PS5D3LGOJ5UHT6DRJWDPSIIWLR';

const server = new rpc.Server('https://soroban-testnet.stellar.org');

async function init() {
    const adminKp = Keypair.fromSecret(ADMIN_SECRET);
    const acc = await (await fetch('https://horizon-testnet.stellar.org/accounts/' + adminKp.publicKey())).json();
    const source = new Account(adminKp.publicKey(), acc.sequence);
    
    const contract = new Contract(CONTRACT_ID);
    
    // Exact order from Rust: admin, native_xlm_sac, ylds_sac
    const callOp = contract.call(
        'initialize',
        nativeToScVal(adminKp.publicKey(), { type: 'address' }),
        nativeToScVal(NATIVE_XLM_SAC, { type: 'address' }),
        nativeToScVal(YLDS_SAC_ID, { type: 'address' })
    );
    
    let tx = new TransactionBuilder(source, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(callOp)
        .setTimeout(30).build();
        
    let sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
        console.error("Simulation failed", sim.error);
        return;
    }
    tx = rpc.assembleTransaction(tx, sim).build();
    tx.sign(adminKp);
    
    const sendRes = await server.sendTransaction(tx);
    let hash = sendRes.hash;
    let txStatus = await server.getTransaction(hash);
    while (txStatus.status === 'PENDING') {
        await new Promise(r => setTimeout(r, 2000));
        txStatus = await server.getTransaction(hash);
    }
    console.log("Initialized successfully!", txStatus.status);
}

init().catch(console.error);
