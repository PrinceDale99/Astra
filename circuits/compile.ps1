Write-Host "--- Compiling Astra Repo Health Circuit ---"

# Setup directories
New-Item -ItemType Directory -Force -Path build
New-Item -ItemType Directory -Force -Path keys

# Compile circuit
Write-Host "1. Compiling .circom to .r1cs and .wasm"
circom repo_health.circom --r1cs --wasm --sym -o build

# Download powers of tau
if (!(Test-Path "build\ptau254.ptau")) {
    Write-Host "2. Downloading Powers of Tau Phase 1 (ptau254)"
    Invoke-WebRequest -Uri "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau" -OutFile "build\ptau254.ptau"
} else {
    Write-Host "2. Powers of Tau Phase 1 already downloaded"
}

# Generate proving and verification keys
Write-Host "3. Generating Groth16 zkey Phase 2"
snarkjs groth16 setup build\repo_health.r1cs build\ptau254.ptau keys\repo_health_0000.zkey

Write-Host "4. Contributing random entropy"
snarkjs zkey contribute keys\repo_health_0000.zkey keys\repo_health_final.zkey --name="Astra Contributor" -v -e="RandomEntropy123"

Write-Host "5. Exporting Verification Key"
snarkjs zkey export verificationkey keys\repo_health_final.zkey keys\verification_key.json

Write-Host "--- Compilation Complete! ---"
Write-Host "Proving key (WASM): build\repo_health_js\repo_health.wasm"
Write-Host "Proving key (zkey): keys\repo_health_final.zkey"
Write-Host "Verification key: keys\verification_key.json"
