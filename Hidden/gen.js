const { Keypair, rpc, Contract, TransactionBuilder, Networks, xdr, nativeToScVal, Account, Operation, Asset, Horizon } = require('@stellar/stellar-sdk');
const fs = require('fs');

const CONTRACT_ID = 'CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US';
const MD_FILE = 'interactions.md';

const YLDS_ASSET = new Asset('YLDS', 'GDWVUZ6W6WTJUTCM23LXZYU63D7D5PKHXZIQ3BMTNYN5KLFDH7NIJOZC');

const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');

async function sendTxAndWait(server, tx) {
    try {
        const res = await horizon.submitTransaction(tx);
        return res.hash;
    } catch (e) {
        throw new Error(`Horizon submit failed: ${JSON.stringify(e?.response?.data?.extras?.result_codes || e.message)}`);
    }
}

async function generate() {
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    const contract = new Contract(CONTRACT_ID);

    fs.writeFileSync(MD_FILE, '# Contract Interactions\n\n| Testnet Address | TxId | Stellar Expert Link | Status |\n|---|---|---|---|\n');

    let successCount = 0;

    while (successCount < 52) {
        try {
            const kp = Keypair.random();
            const address = kp.publicKey();
            
            console.log(`\n--- Attempting Account ${successCount + 1}/52: ${address} ---`);
            const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${address}`);
            if (!fbRes.ok) {
                console.error('Friendbot failed. Retrying...');
                continue;
            }

            let accountData = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`)).json();
            let sourceAccount = new Account(address, accountData.sequence);

            // Transaction 1: Add trustline to YLDS (classic operation)
            let trustTx = new TransactionBuilder(sourceAccount, { fee: '10000', networkPassphrase: Networks.TESTNET })
                .addOperation(Operation.changeTrust({ asset: YLDS_ASSET }))
                .setTimeout(60)
                .build();
            trustTx.sign(kp);
            await sendTxAndWait(server, trustTx);

            // Fetch sequence again
            accountData = await (await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`)).json();
            sourceAccount = new Account(address, accountData.sequence);

            // Transaction 2: create_repo_deal
            const depositAmount = 100_0000000; // 100 XLM
            const proofBytes = Buffer.from([0]);
            const publicSignalsScVal = [ nativeToScVal(BigInt(1), { type: 'i128' }) ];
            const args = [
                nativeToScVal(address, { type: 'address' }),
                nativeToScVal(BigInt(depositAmount), { type: 'i128' }),
                nativeToScVal(proofBytes, { type: 'bytes' }),
                xdr.ScVal.scvVec(publicSignalsScVal),
            ];

            let txBuilder = new TransactionBuilder(sourceAccount, { fee: '1000000', networkPassphrase: Networks.TESTNET });
            txBuilder.addOperation(contract.call('create_repo_deal', ...args));
            let tx = txBuilder.setTimeout(60).build();

            const simulation = await server.simulateTransaction(tx);
            if (rpc.Api.isSimulationError(simulation)) {
                console.error(`Simulation failed:`, simulation.error);
                continue;
            }

            tx = rpc.assembleTransaction(tx, simulation).build();
            tx.sign(kp);

            const hash = await sendTxAndWait(server, tx);
            console.log(`✅ Success! Hash: ${hash}`);
            
            const expertLink = `https://stellar.expert/explorer/testnet/tx/${hash}`;
            const mdLine = `| ${address} | ${hash} | [Link](${expertLink}) | Passed |\n`;
            fs.appendFileSync(MD_FILE, mdLine);
            successCount++;

        } catch (err) {
            console.error('Error during interaction:', err.message);
        }
    }
    console.log(`\n🎉 Successfully generated 52 interactions!`);
}

generate();
