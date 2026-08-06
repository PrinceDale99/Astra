const { Keypair, rpc, TransactionBuilder, Networks, Account, Operation, nativeToScVal, Contract, Horizon } = require('@stellar/stellar-sdk');

const NEW_REPO_CONTRACT = 'CDGKWTX3V2YZA4KTOKU6S6L5PXT6FAIU5IIEYMWFHSVYF2H27CWG6HC5';
const YLDS_SAC_ID = 'CD6K5BNVYJMK7GBKSFIZTIBSKKE4RROR7EB2XQCPWYBE5AH37IM66ZZR';
const XLM_SAC_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const ADMIN_SECRET = 'SCYMKQJ6QYIEFJAWW3MLGZ5JPXSSOCN7VI7IGUU7DDQ65DF7YJEMSEZB';
const DISTRIBUTOR_SECRET = 'SD5M2V73AOTYHYXUDYVWWV73D4L7X2SLL5TCRG7I5SNT64L2U6E66XZ6'; // from task-890 if we had it.. wait I didn't save it!

// I didn't save distributor secret. I will just mint more YLDS to the issuer and transfer from issuer!

async function init() {
    const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    const adminKp = Keypair.fromSecret(ADMIN_SECRET);

    console.log('1. Initializing Contract...');
    const repoContract = new Contract(NEW_REPO_CONTRACT);
    const acct = await horizon.loadAccount(adminKp.publicKey());
    const sourceAcct = new Account(adminKp.publicKey(), acct.sequence);

    const initArgs = [
        nativeToScVal(adminKp.publicKey(), { type: 'address' }), // admin
        nativeToScVal(XLM_SAC_ID, { type: 'address' }), // native xlm sac
        nativeToScVal(YLDS_SAC_ID, { type: 'address' }) // ylds sac
    ];

    let tx = new TransactionBuilder(sourceAcct, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(repoContract.call('initialize', ...initArgs))
        .setTimeout(30)
        .build();

    let sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
    
    tx = rpc.assembleTransaction(tx, sim).build();
    tx.sign(adminKp);
    let sendRes = await server.sendTransaction(tx);
    
    // poll
    for(let i=0; i<20; i++) {
        let status = await server.getTransaction(sendRes.hash);
        if(status.status === 'SUCCESS') break;
        if(status.status === 'FAILED') throw new Error('init failed');
        await new Promise(r=>setTimeout(r,2000));
    }
    console.log('✅ Initialized');

    console.log('2. Transferring 3,000,000 YLDS to Contract from Issuer...');
    const yldsSac = new Contract(YLDS_SAC_ID);
    const acct2 = await horizon.loadAccount(adminKp.publicKey());
    const sourceAcct2 = new Account(adminKp.publicKey(), acct2.sequence);
    
    // Transfer from issuer directly (issuer holds the remaining supply)
    const transferArgs = [
        nativeToScVal(adminKp.publicKey(), { type: 'address' }), // from
        nativeToScVal(NEW_REPO_CONTRACT, { type: 'address' }), // to
        nativeToScVal(BigInt(3000000_0000000), { type: 'i128' }) // amount in stroops
    ];

    let tx2 = new TransactionBuilder(sourceAcct2, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(yldsSac.call('transfer', ...transferArgs))
        .setTimeout(30)
        .build();

    let sim2 = await server.simulateTransaction(tx2);
    if (rpc.Api.isSimulationError(sim2)) throw new Error(sim2.error);
    
    tx2 = rpc.assembleTransaction(tx2, sim2).build();
    tx2.sign(adminKp);
    let sendRes2 = await server.sendTransaction(tx2);
    
    // poll
    for(let i=0; i<20; i++) {
        let status = await server.getTransaction(sendRes2.hash);
        if(status.status === 'SUCCESS') break;
        if(status.status === 'FAILED') throw new Error('transfer failed');
        await new Promise(r=>setTimeout(r,2000));
    }
    console.log('✅ Funded');
}
init().catch(console.error);
