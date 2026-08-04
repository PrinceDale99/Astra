#!/bin/bash
set -e

echo "--- Compiling Astra Repo Health Circuit ---"

# Setup directories
mkdir -p build
mkdir -p keys

# Compile circuit
echo "1. Compiling .circom to .r1cs and .wasm"
circom repo_health.circom --r1cs --wasm --sym -o build

# Download powers of tau
if [ ! -f build/ptau254.ptau ]; then
    echo "2. Downloading Powers of Tau Phase 1 (ptau254)"
    curl -o build/ptau254.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
else
    echo "2. Powers of Tau Phase 1 already downloaded"
fi

# Generate proving and verification keys
echo "3. Generating Groth16 zkey Phase 2"
snarkjs groth16 setup build/repo_health.r1cs build/ptau254.ptau keys/repo_health_0000.zkey

echo "4. Contributing random entropy"
snarkjs zkey contribute keys/repo_health_0000.zkey keys/repo_health_final.zkey --name="Astra Contributor" -v -e="$(head -c 32 /dev/urandom | base64)"

echo "5. Exporting Verification Key"
snarkjs zkey export verificationkey keys/repo_health_final.zkey keys/verification_key.json

echo "--- Compilation Complete! ---"
echo "Proving key (WASM): build/repo_health_js/repo_health.wasm"
echo "Proving key (zkey): keys/repo_health_final.zkey"
echo "Verification key: keys/verification_key.json"
