const { Keypair, Horizon, rpc, TransactionBuilder, Networks, Account, nativeToScVal, Contract, xdr, Asset } = require('@stellar/stellar-sdk');

const CONTRACT_ID = 'CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2';
const ISSUER_SECRET = 'SBXCMEHHQOMHRJJCNMIAWWY4SC6K5NYI64Z274FH6LJFVFPXLAZL4L4C';
const YLDS_SAC_ID = 'CBT2FAHTV57M4LFZREZNOU7XYQQZWKX3GKCF3RGVX7DJVYNFOVJ3TFVT';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_URL = 'https://soroban-testnet.stellar.org';
const NETWORK = Networks.TESTNET;

const YLDS_AMOUNT = BigInt(300_000) * BigInt(10_000_000); 

async function fundXLM() {
    const horizon = new Horizon.Server(HORIZON_URL);
    
    // Create a temporary aggregator wallet
    const aggKp = Keypair.random();
    console.log("Funding aggregator wallet:", aggKp.publicKey());
    await fetch(`https://friendbot.stellar.org?addr=${aggKp.publicKey()}`);
    
    console.log("Generating 2M XLM via Friendbot (takes a minute)...");
    
    // We need 2,000,000 XLM, Friendbot gives 10k per call, so 200 accounts needed
    const batches = 20; 
    const perBatch = 10;
    
    for (let i = 0; i < batches; i++) {
        process.stdout.write(`Batch ${i+1}/${batches}: `);
        const kps = Array.from({length: perBatch}, () => Keypair.random());
        
        // Fund them all
        await Promise.all(kps.map(kp => fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`).catch(() => {})));
        
        let aggAcc = await horizon.loadAccount(aggKp.publicKey());
        let tx = new TransactionBuilder(new Account(aggKp.publicKey(), aggAcc.sequence), { fee: '1000000', networkPassphrase: NETWORK });
        
        // Merge them all into aggregator
        for (let kp of kps) {
            tx.addOperation(
                require('@stellar/stellar-sdk').Operation.accountMerge({
                    destination: aggKp.publicKey(),
                    source: kp.publicKey()
                })
            );
        }
        
        let builtTx = tx.setTimeout(60).build();
        builtTx.sign(aggKp);
        for (let kp of kps) builtTx.sign(kp);
        
        await horizon.submitTransaction(builtTx).catch(e => console.error("Batch failed", e.response?.data?.extras));
        process.stdout.write("Merged!\n");
    }
    
    let finalAgg = await horizon.loadAccount(aggKp.publicKey());
    let balance = finalAgg.balances.find(b => b.asset_type === 'native').balance;
    console.log("Aggregator final balance:", balance);
    
    // Send 2M to contract
    const toSend = (Number(balance) - 100).toFixed(7);
    console.log(`Sending ${toSend} XLM to contract...`);
    let sendTx = new TransactionBuilder(new Account(aggKp.publicKey(), finalAgg.sequence), { fee: '100000', networkPassphrase: NETWORK })
        .addOperation(new Contract('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC').call(
            'transfer',
            nativeToScVal(aggKp.publicKey(), { type: 'address' }),
            nativeToScVal(CONTRACT_ID, { type: 'address' }),
            nativeToScVal(BigInt(Math.floor(Number(toSend) * 10000000)), { type: 'i128' })
        ))
        .setTimeout(60).build();
    let sim = await new rpc.Server(SOROBAN_URL).simulateTransaction(sendTx);
    sendTx = rpc.assembleTransaction(sendTx, sim).build();
    sendTx.sign(aggKp);
    await new rpc.Server(SOROBAN_URL).sendTransaction(sendTx);
    console.log("XLM sent to contract via SAC!");
}

async function fundYLDS() {
    console.log("Skipping YLDS, already done.");
}


async function main() {
    await fundYLDS().catch(console.error);
    await fundXLM().catch(console.error);
}

main();
