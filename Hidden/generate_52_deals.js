const { Keypair, rpc, Contract, TransactionBuilder, Networks, xdr, nativeToScVal, Account, Asset, Operation } = require('@stellar/stellar-sdk');
const fs = require('fs');

const CONTRACT_ID = 'CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2';

async function generateDeals() {
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    const contract = new Contract(CONTRACT_ID);

    console.log(`Generating 52 Repo Deals on ${CONTRACT_ID}...`);
    let interactionsMd = '# Contract Interactions\n\n| Testnet Address | TxId | Stellar Expert Link |\n|---|---|---|\n';

    for (let i = 0; i < 52; i++) {
        const kp = Keypair.random();
        
        console.log(`\n--- Deal ${i+1}/52 ---`);
        console.log(`Funding borrower wallet ${kp.publicKey()}...`);
        try {
            const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
            if (!fbRes.ok) {
                console.error('Friendbot failed:', await fbRes.text());
                // Retry once
                const fbRes2 = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
                if (!fbRes2.ok) continue;
            }
        } catch (e) {
            console.error('Friendbot error:', e.message);
            continue;
        }

        const accountData = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${kp.publicKey()}`)).json();
        const sourceAccount = new Account(kp.publicKey(), accountData.sequence);

        // Add trustline to YLDS
        const issuerPub = 'GDWVUZ6W6WTJUTCM23LXZYU63D7D5PKHXZIQ3BMTNYN5KLFDH7NIJOZC'; // The public key for SBXCMEHHQOMHRJJCNMIAWWY4SC6K5NYI64Z274FH6LJFVFPXLAZL4L4C
        const yldsAsset = new Asset('YLDS', issuerPub);
        
        let trustTx = new TransactionBuilder(sourceAccount, { fee: '100000', networkPassphrase: Networks.TESTNET })
            .addOperation(Operation.changeTrust({ asset: yldsAsset }))
            .setTimeout(30).build();
        trustTx.sign(kp);
        const trustRes = await server.sendTransaction(trustTx);
        
        // Wait for confirmation
        let trustStatus = await server.getTransaction(trustRes.hash).catch(() => ({ status: 'NOT_FOUND' }));
        let attempts = 0;
        while (trustStatus.status === 'NOT_FOUND' && attempts < 15) {
            await new Promise(r => setTimeout(r, 2000));
            trustStatus = await server.getTransaction(trustRes.hash).catch(() => ({ status: 'NOT_FOUND' }));
            attempts++;
        }
        if (trustStatus.status !== 'SUCCESS') {
            console.error("Trustline failed!", trustStatus);
            continue;
        }
        
        // Refresh sequence
        const accountDataAfter = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${kp.publicKey()}`)).json();
        const sourceAccountUpdated = new Account(kp.publicKey(), accountDataAfter.sequence);
        
        console.log(`Trustline added for ${kp.publicKey()}`);

        const collateralAmount = 5000_0000000;
        const borrowAmount = 2500_0000000;

        // ZK arguments
        const proofBytes = Buffer.from(new Uint8Array([0, 1, 2, 3]));
        const publicSignalsScVal = [
            nativeToScVal(BigInt(borrowAmount), { type: 'i128' }),
            nativeToScVal(BigInt(100), { type: 'i128' }),
            nativeToScVal(BigInt(150), { type: 'i128' }),
            nativeToScVal(BigInt(Math.floor(Date.now() / 1000)), { type: 'i128' })
        ];

        const args = [
            nativeToScVal(kp.publicKey(), { type: 'address' }),
            nativeToScVal(BigInt(collateralAmount), { type: 'i128' }),
            nativeToScVal(proofBytes, { type: 'bytes' }),
            xdr.ScVal.scvVec(publicSignalsScVal),
        ];

        const callOperation = contract.call('create_repo_deal', ...args);

        let tx = new TransactionBuilder(sourceAccountUpdated, { fee: '100000', networkPassphrase: Networks.TESTNET })
            .addOperation(callOperation)
            .setTimeout(60)
            .build();

        console.log(`Simulating transaction...`);
        const simulation = await server.simulateTransaction(tx);
        
        if (rpc.Api.isSimulationError(simulation)) {
            console.error(`Simulation failed: ${simulation.error}`);
            continue;
        }

        tx = rpc.assembleTransaction(tx, simulation).build();
        tx.sign(kp);

        console.log(`Submitting transaction...`);
        const sendRes = await server.sendTransaction(tx);
        
        if (sendRes.status === 'ERROR') {
            console.error(`Submission failed`, sendRes);
        } else {
            let hash = sendRes.hash;
            let txStatus = await server.getTransaction(hash).catch(() => ({ status: 'NOT_FOUND' }));
            let attemptsTx = 0;
            while (txStatus.status === 'NOT_FOUND' && attemptsTx < 15) {
                await new Promise(r => setTimeout(r, 2000));
                txStatus = await server.getTransaction(hash).catch(() => ({ status: 'NOT_FOUND' }));
                attemptsTx++;
            }
            if (txStatus.status === 'SUCCESS') {
                console.log(`✅ Deal ${i+1} Executed! Hash: ${hash}`);
                interactionsMd += `| ${kp.publicKey()} | ${hash} | [Link](https://stellar.expert/explorer/testnet/tx/${hash}) |\n`;
                // Save incrementally in case of interruption
                fs.writeFileSync('interactions.md', interactionsMd);
            } else {
                console.error(`❌ Deal ${i+1} failed on chain.`);
            }
        }
    }
    console.log("Done generating all deals!");
}

generateDeals();
