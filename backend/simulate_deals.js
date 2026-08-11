const { Keypair, rpc, Contract, TransactionBuilder, Networks, xdr, nativeToScVal, Account } = require('@stellar/stellar-sdk');

const CONTRACT_ID = 'CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US';
const NATIVE_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

async function simulateDeals() {
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    const contract = new Contract(CONTRACT_ID);

    console.log(`Simulating 5 Repo Deals on ${CONTRACT_ID}...`);

    for (let i = 0; i < 5; i++) {
        const kp = Keypair.random();
        
        console.log(`\n--- Deal ${i+1} ---`);
        console.log(`Funding borrower wallet ${kp.publicKey()}...`);
        const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
        if (!fbRes.ok) {
            console.error('Friendbot failed:', await fbRes.text());
            continue;
        }

        const accountData = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${kp.publicKey()}`)).json();
        const sourceAccount = new Account(kp.publicKey(), accountData.sequence);

        const collateralAmount = 5000_0000000; // 5000 XLM
        const borrowAmount = 2500_0000000; // 2500 XLM

        // ZK arguments
        const proofBytes = Buffer.from(new Uint8Array([0, 1, 2, 3]));
        const publicSignalsScVal = [
            nativeToScVal(BigInt(borrowAmount), { type: 'i128' }), // requestedLoanXLM
            nativeToScVal(BigInt(100), { type: 'i128' }), // oraclePriceXLM
            nativeToScVal(BigInt(150), { type: 'i128' }), // minHealthFactor
            nativeToScVal(BigInt(Math.floor(Date.now() / 1000)), { type: 'i128' }) // currentTimestamp
        ];

        const args = [
            nativeToScVal(kp.publicKey(), { type: 'address' }), // borrower
            nativeToScVal(BigInt(collateralAmount), { type: 'i128' }), // xlm_deposit_amount
            nativeToScVal(proofBytes, { type: 'bytes' }), // proof
            xdr.ScVal.scvVec(publicSignalsScVal), // public_signals
        ];

        const callOperation = contract.call('create_repo_deal', ...args);

        let tx = new TransactionBuilder(sourceAccount, { fee: '100000', networkPassphrase: Networks.TESTNET })
            .addOperation(callOperation)
            .setTimeout(30)
            .build();

        console.log(`Simulating transaction for Deal ${i+1}...`);
        const simulation = await server.simulateTransaction(tx);
        
        if (rpc.Api.isSimulationError(simulation)) {
            console.error(`Simulation failed for Deal ${i+1}: ${simulation.error}`);
            continue;
        }

        tx = rpc.assembleTransaction(tx, simulation).build();
        tx.sign(kp);

        console.log(`Submitting transaction for Deal ${i+1}...`);
        const sendRes = await server.sendTransaction(tx);
        
        if (sendRes.status === 'ERROR') {
            console.error(`Submission failed for Deal ${i+1}`, sendRes);
        } else {
            let hash = sendRes.hash;
            let txStatus = await server.getTransaction(hash);
            while (txStatus.status === 'PENDING') {
                await new Promise(r => setTimeout(r, 2000));
                txStatus = await server.getTransaction(hash);
            }
            if (txStatus.status === 'SUCCESS') {
                console.log(`✅ Deal ${i+1} Executed! Hash: ${hash}`);
            } else {
                console.error(`❌ Deal ${i+1} failed on chain.`);
            }
        }
    }
}

simulateDeals();
