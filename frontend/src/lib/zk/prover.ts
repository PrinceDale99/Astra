interface ZKInputs {
  collateralAmount: number;
  bondMaturityDate: number;
  institutionalSecret: string;
  requestedLoanXLM: number;
  oraclePriceXLM: number;
  minHealthFactor: number;
  currentTimestamp: number;
}

interface ZKProofResult {
  proofBytes: Uint8Array;
  publicSignals: number[];
}

/**
 * Calls the Astra Layer 3 Backend Orchestration Engine to generate a Zero-Knowledge Proof.
 * Offloading this to the server-side prevents exposing the WASM and ZKey to the client 
 * and handles the heavy computation in an optimized Render free-tier instance.
 */
export async function generateRepoHealthProof(inputs: ZKInputs): Promise<ZKProofResult> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  try {
    const response = await fetch(`${API_URL}/api/v1/zk/generate-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collateralAmount: inputs.collateralAmount,
        bondMaturityDate: inputs.bondMaturityDate,
        institutionalSecret: inputs.institutionalSecret,
        requestedLoanXLM: inputs.requestedLoanXLM,
        oraclePriceXLM: inputs.oraclePriceXLM,
        minHealthFactor: inputs.minHealthFactor,
        currentTimestamp: inputs.currentTimestamp,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // The backend returns the proofBytes as a hex string for CAP-80
    // We convert it to Uint8Array for Soroban submission
    const proofBytes = Buffer.from(data.proofBytes, 'hex');

    // The backend returns publicSignals as strings, ensure they are converted for Soroban ScVal
    const formattedSignals = data.publicSignals.map((sig: string) => parseInt(sig, 10));

    return {
      proofBytes: new Uint8Array(proofBytes),
      publicSignals: formattedSignals,
    };
  } catch (error: any) {
    console.error('Failed to generate ZK Proof via backend orchestration:', error);
    throw new Error(error.message || 'ZK Prover execution failed.');
  }
}
