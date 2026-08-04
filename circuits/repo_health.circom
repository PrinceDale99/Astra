pragma circom 2.1.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

template RepoHealth() {
    // Private Inputs
    signal input collateralAmount;
    signal input bondMaturityDate;
    signal input institutionalSecret;

    // Public Inputs
    signal input requestedLoanXLM;
    signal input oraclePriceXLM;
    signal input minHealthFactor;
    signal input currentTimestamp;

    // Outputs
    signal output commitmentHash;

    // 1. Enforce bondMaturityDate > currentTimestamp
    component maturityCheck = GreaterThan(64);
    maturityCheck.in[0] <== bondMaturityDate;
    maturityCheck.in[1] <== currentTimestamp;
    maturityCheck.out === 1;

    // 2. Calculate totalCollateralValue = collateralAmount * oraclePriceXLM
    signal totalCollateralValue;
    totalCollateralValue <== collateralAmount * oraclePriceXLM;

    // 3. Calculate requiredCollateralValue = (requestedLoanXLM * minHealthFactor) / 100
    // We check totalCollateralValue * 100 >= requestedLoanXLM * minHealthFactor
    signal requiredCollateralValueScaled;
    requiredCollateralValueScaled <== requestedLoanXLM * minHealthFactor;

    signal totalCollateralValueScaled;
    totalCollateralValueScaled <== totalCollateralValue * 100;

    // 4. Constrain totalCollateralValueScaled >= requiredCollateralValueScaled
    component healthCheck = GreaterEqThan(252);
    healthCheck.in[0] <== totalCollateralValueScaled;
    healthCheck.in[1] <== requiredCollateralValueScaled;
    healthCheck.out === 1;

    // 5. Compute Poseidon commitment hash over (collateralAmount, institutionalSecret)
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== collateralAmount;
    poseidon.inputs[1] <== institutionalSecret;
    commitmentHash <== poseidon.out;
}

component main {public [requestedLoanXLM, oraclePriceXLM, minHealthFactor, currentTimestamp]} = RepoHealth();
