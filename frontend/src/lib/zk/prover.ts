interface ZKInputs {
  collateralAmount: number;
  bondMaturityDate: number;
  institutionalSecret: string;
  requestedLoanXLM: number;
  oraclePriceXLM: number;
  minHealthFactor: number;
  currentTimestamp: number;
}

export interface ZKProofResult {
  proofBytes: Uint8Array;
  // publicSignals are kept as raw strings to preserve BigInt precision from Poseidon hash
  publicSignals: string[];
}

/**
 * Calls the Astra Layer 3 Backend Orchestration Engine to generate a Zero-Knowledge Proof.
 * Offloading this to the server-side prevents exposing the WASM and ZKey to the client 
 * and handles the heavy computation in an optimized Render free-tier instance.
 */
export async function generateRepoHealthProof(inputs: ZKInputs): Promise<ZKProofResult> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astra-9mg6.onrender.com';

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
    throw new Error(errorData.error || `ZK Backend error: HTTP ${response.status}`);
  }

  const data = await response.json();

  // proofBytes comes back as a hex string - decode it properly
  const proofBytesBuffer = Buffer.from(data.proofBytes, 'hex');

  // Keep publicSignals as strings to preserve full BigInt precision
  // (Poseidon hashes are huge numbers that parseInt/Number would corrupt)
  const publicSignals: string[] = (data.publicSignals as any[]).map((sig) => String(sig));

  return {
    proofBytes: new Uint8Array(proofBytesBuffer),
    publicSignals,
  };
}
