import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

export async function setupTrustline(
  borrower: string,
  assetCode: string,
  issuer: string,
  horizonUrl = 'https://horizon-testnet.stellar.org'
): Promise<string> {
  const accountResponse = await fetch(`${horizonUrl}/accounts/${borrower}`);
  if (!accountResponse.ok) {
    throw new Error('Account does not exist on Testnet.');
  }
  const accountData = await accountResponse.json();
  
  const asset = new Asset(assetCode, issuer);

  let tx = new TransactionBuilder(
    { accountId: () => borrower, sequenceNumber: () => accountData.sequence, incrementSequenceNumber: () => {} } as any, 
    { fee: '100000', networkPassphrase: Networks.TESTNET }
  )
    .addOperation(Operation.changeTrust({ asset, limit: '10000000' }))
    .setTimeout(30)
    .build();

  const rawXdr = tx.toXDR();
  const signResult = await signTransaction(rawXdr, {
    networkPassphrase: Networks.TESTNET,
  });

  if (signResult.error) {
    throw new Error(`Freighter signing failed: ${String(signResult.error)}`);
  }
  if (!signResult.signedTxXdr) {
    throw new Error('Freighter returned empty signature.');
  }

  const response = await fetch(`${horizonUrl}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `tx=${encodeURIComponent(signResult.signedTxXdr)}`,
  });
  
  const result = await response.json();
  if (result.hash) {
    return result.hash;
  } else {
    throw new Error(`Trustline submission failed: ${JSON.stringify(result)}`);
  }
}
