// @ts-ignore
import * as snarkjs from 'snarkjs';
import path from 'path';
import fs from 'fs';

export class ZkService {
  static async generateProof(inputData: any) {
    const wasmPath = path.join(process.cwd(), 'public', 'repo_health.wasm');
    const zkeyPath = path.join(process.cwd(), 'public', 'repo_health_final.zkey');

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      throw new Error('Circuit or ZKey files missing. Ensure they are present in the public/ directory.');
    }

    // Convert secret string to a big integer or numeric representation for circom
    // For this implementation we use a simple string hash for the salt
    let numericSecret = 0;
    for (let i = 0; i < inputData.institutionalSecret.length; i++) {
      numericSecret = (numericSecret * 31 + inputData.institutionalSecret.charCodeAt(i)) % 1000000000;
    }

    const input = {
      collateral_amount: inputData.collateralAmount,
      bond_maturity_date: inputData.bondMaturityDate,
      requested_loan_xlm: inputData.requestedLoanXLM,
      oracle_price_xlm: inputData.oraclePriceXLM,
      min_health_factor: inputData.minHealthFactor,
      current_timestamp: inputData.currentTimestamp,
      institutional_secret_salt: numericSecret
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );

    // Format for CAP-80 
    const proofBytes = this.formatProof(proof);

    return { proof, proofBytes, publicSignals };
  }

  static async verifyProof(proof: any, publicSignals: any) {
    const vKeyPath = path.join(process.cwd(), 'public', 'verification_key.json');
    if (!fs.existsSync(vKeyPath)) {
      throw new Error('Verification key missing.');
    }

    const vKey = JSON.parse(fs.readFileSync(vKeyPath, 'utf-8'));
    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return res;
  }

  private static formatProof(proof: any) {
    // This function maps the json proof to the raw bytes needed by CAP-80 host functions
    // In production, proper BigInt byte padding (32-byte BE) for BN254 is required here.
    return Buffer.from(JSON.stringify(proof)).toString('hex');
  }
}
