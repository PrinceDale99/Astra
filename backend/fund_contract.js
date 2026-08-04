const { Keypair, rpc, TransactionBuilder, Networks, Account, Asset, Contract, nativeToScVal, xdr } = require('@stellar/stellar-sdk');

const CONTRACT_ID = 'CCFCMYKC3U5UEVQBJ22LOV525ZYIZM62RMILKRJBDDPL4TOPMXZEEPMM';
const NATIVE_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

async function fundContract() {
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    let totalFunded = 0;

    console.log(`Funding contract ${CONTRACT_ID} with ~320k XLM...`);
    const sacContract = new Contract(NATIVE_SAC);

    for (let i = 0; i < 32; i++) {
        const kp = Keypair.random();
        
        // Fund with friendbot
        console.log(`[${i+1}/32] Funding temp wallet ${kp.publicKey()}...`);
        const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
        if (!fbRes.ok) {
            console.error('Friendbot failed:', await fbRes.text());
            continue;
        }

        // We have 10,000 XLM. Transfer 9,990 to the contract.
        const accountData = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${kp.publicKey()}`)).json();
        const sourceAccount = new Account(kp.publicKey(), accountData.sequence);

        // 9990 XLM in stroops
        const amountScVal = nativeToScVal(BigInt(9990_0000000), { type: 'i128' });
        const fromScVal = nativeToScVal(kp.publicKey(), { type: 'address' });
        const toScVal = nativeToScVal(CONTRACT_ID, { type: 'address' });

        const callOp = sacContract.call('transfer', fromScVal, toScVal, amountScVal);

        let tx = new TransactionBuilder(
            sourceAccount, 
            { fee: '100000', networkPassphrase: Networks.TESTNET }
        )
        .addOperation(callOp)
        .setTimeout(30)
        .build();

        console.log(`[${i+1}/32] Simulating transfer...`);
        const sim = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) {
            console.error(`Simulation failed for ${i+1}: ${sim.error}`);
            continue;
        }

        tx = rpc.assembleTransaction(tx, sim).build();
        tx.sign(kp);

        console.log(`[${i+1}/32] Submitting to network...`);
        const sendRes = await server.sendTransaction(tx);
        
        if (sendRes.status === 'ERROR') {
            console.error('Transfer failed', sendRes);
        } else {
            // Poll for status
            let hash = sendRes.hash;
            let txStatus = await server.getTransaction(hash);
            while (txStatus.status === 'PENDING') {
                await new Promise(r => setTimeout(r, 2000));
                txStatus = await server.getTransaction(hash);
            }
            if (txStatus.status === 'SUCCESS') {
                totalFunded += 9990;
                console.log(`[${i+1}/32] Success! Total funded: ${totalFunded} XLM`);
            } else {
                console.error(`[${i+1}/32] Tx failed on chain`);
            }
        }
    }
    console.log(`Done! Contract successfully funded with ${totalFunded} XLM.`);
}

fundContract();
