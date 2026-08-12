const { Keypair, Asset, rpc, TransactionBuilder, Networks, Account, Contract, nativeToScVal } = require('@stellar/stellar-sdk');

const ISSUER_SECRET = 'SBXCMEHHQOMHRJJCNMIAWWY4SC6K5NYI64Z274FH6LJFVFPXLAZL4L4C';
const DISTRIBUTOR_SECRET = 'SDXG524XQPOQYNT5ZOSQ46FIVW5QZ7KIVG3OQ4QNDTIV352RBYV2YIX7';
const YLDS_SAC_ID = 'CBT2FAHTV57M4LFZREZNOU7XYQQZWKX3GKCF3RGVX7DJVYNFOVJ3TFVT';
const CONTRACT_ID = 'CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2';
const NATIVE_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const server = new rpc.Server('https://soroban-testnet.stellar.org');

async function fund() {
    const distributorKp = Keypair.fromSecret(DISTRIBUTOR_SECRET);
    
    // 1. Transfer 300k YLDS
    console.log("Transferring 300,000 YLDS to contract...");
    const distAcc = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${distributorKp.publicKey()}`)).json();
    const source = new Account(distributorKp.publicKey(), distAcc.sequence);
    
    const yldsContract = new Contract(YLDS_SAC_ID);
    const amountYlds = 300_000n * 10_000_000n; // 300k YLDS in stroops
    
    let tx1 = new TransactionBuilder(source, { fee: '10000', networkPassphrase: Networks.TESTNET })
        .addOperation(yldsContract.call(
            'transfer',
            nativeToScVal(distributorKp.publicKey(), { type: 'address' }),
            nativeToScVal(CONTRACT_ID, { type: 'address' }),
            nativeToScVal(amountYlds, { type: 'i128' })
        )).setTimeout(30).build();
        
    let sim1 = await server.simulateTransaction(tx1);
    tx1 = rpc.assembleTransaction(tx1, sim1).build();
    tx1.sign(distributorKp);
    await server.sendTransaction(tx1);
    console.log("YLDS transferred.");

    // 2. Try to get some XLM for the contract
    console.log("Funding contract with XLM...");
    const xlmsac = new Contract(NATIVE_SAC);
    
    // Hit friendbot a few times for the distributor to get XLM
    await Promise.all([
        fetch(`https://friendbot.stellar.org/?addr=${distributorKp.publicKey()}`),
        fetch(`https://friendbot.stellar.org/?addr=${distributorKp.publicKey()}`),
        fetch(`https://friendbot.stellar.org/?addr=${distributorKp.publicKey()}`)
    ]);
    
    const distAcc2 = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${distributorKp.publicKey()}`)).json();
    const source2 = new Account(distributorKp.publicKey(), distAcc2.sequence);
    
    const amountXlm = 15_000n * 10_000_000n; // Transfer 15k XLM (getting 1.5M from testnet faucet is practically impossible without running for hours)
    let tx2 = new TransactionBuilder(source2, { fee: '10000', networkPassphrase: Networks.TESTNET })
        .addOperation(xlmsac.call(
            'transfer',
            nativeToScVal(distributorKp.publicKey(), { type: 'address' }),
            nativeToScVal(CONTRACT_ID, { type: 'address' }),
            nativeToScVal(amountXlm, { type: 'i128' })
        )).setTimeout(30).build();
        
    let sim2 = await server.simulateTransaction(tx2);
    tx2 = rpc.assembleTransaction(tx2, sim2).build();
    tx2.sign(distributorKp);
    await server.sendTransaction(tx2);
    console.log("XLM transferred.");
}

fund().catch(console.error);
