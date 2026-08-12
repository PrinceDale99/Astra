const { Keypair, Asset, Horizon, rpc, TransactionBuilder, Networks, Account, Operation, nativeToScVal, Contract } = require('@stellar/stellar-sdk');

async function mintYLDS() {
    const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    
    console.log('Generating new Issuer and Distributor for YLDS...');
    const issuer = Keypair.random();
    const distributor = Keypair.random();
    
    console.log('Funding accounts on testnet...');
    await fetch(`https://friendbot.stellar.org/?addr=${issuer.publicKey()}`);
    await fetch(`https://friendbot.stellar.org/?addr=${distributor.publicKey()}`);
    
    const ylds = new Asset('YLDS', issuer.publicKey());
    const yldsContractId = ylds.contractId(Networks.TESTNET);
    
    console.log('Creating trustline from distributor to issuer...');
    let distAcctData = await horizon.loadAccount(distributor.publicKey());
    
    let tx = new TransactionBuilder(distAcctData, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.changeTrust({ asset: ylds, limit: '10000000' }))
        .setTimeout(30)
        .build();
        
    tx.sign(distributor);
    await horizon.submitTransaction(tx);
    
    console.log('Minting 3,000,000 YLDS to the Distributor...');
    const REPO_CONTRACT = 'CB5VLN6TSOLKVLJ2XENVGMAHRVZLAAOGVBFFAJRHOZ7X5XD4WAWLL2F7';
    
    const issuerAcctData = await horizon.loadAccount(issuer.publicKey());
    
    let mintTx = new TransactionBuilder(issuerAcctData, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.payment({ destination: distributor.publicKey(), asset: ylds, amount: '3000000' }))
        .setTimeout(30)
        .build();
        
    mintTx.sign(issuer);
    await horizon.submitTransaction(mintTx);
    
    console.log(`Sending 3,000,000 YLDS to Repo Contract via SAC...`);
    const sacContract = new Contract(yldsContractId);
    distAcctData = await horizon.loadAccount(distributor.publicKey()); // refresh sequence
    const sourceAccount = new Account(distributor.publicKey(), distAcctData.sequence);
    
    const amountScVal = nativeToScVal(BigInt(3000000_0000000), { type: 'i128' }); // 3M with 7 decimals
    const fromScVal = nativeToScVal(distributor.publicKey(), { type: 'address' });
    const toScVal = nativeToScVal(REPO_CONTRACT, { type: 'address' });
    
    const callOp = sacContract.call('transfer', fromScVal, toScVal, amountScVal);
    
    let sacTx = new TransactionBuilder(sourceAccount, { fee: '100000', networkPassphrase: Networks.TESTNET })
        .addOperation(callOp)
        .setTimeout(30)
        .build();
        
    let sim = await server.simulateTransaction(sacTx);
    sacTx = rpc.assembleTransaction(sacTx, sim).build();
    sacTx.sign(distributor);
    
    const sendRes = await server.sendTransaction(sacTx);
    let hash = sendRes.hash;
    let txStatus = await server.getTransaction(hash);
    while (txStatus.status === 'PENDING') {
        await new Promise(r => setTimeout(r, 2000));
        txStatus = await server.getTransaction(hash);
    }
    
    if (txStatus.status === 'SUCCESS') {
        console.log('? Successfully funded contract with 3M YLDS!');
    } else {
        console.error('? Failed to fund contract via SAC', txStatus);
    }
    
    console.log('---');
    console.log('New YLDS Contract ID (SAC):', yldsContractId);
    console.log('Issuer Key:', issuer.publicKey());
    console.log('Issuer Secret:', issuer.secret());
    console.log('---');
    console.log('NOTE: Please update RepoTerminal.tsx to use this new collateralToken contract ID if you want to use YLDS as collateral!');
}
mintYLDS().catch(console.error);
