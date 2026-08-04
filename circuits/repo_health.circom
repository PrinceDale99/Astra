pragma circom 2.1.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template RepoHealth() {
    signal input collateralAmount;
    signal input bondMaturityDate;
    signal input institutionalSecret;
    signal input requestedLoanXLM;
    signal input oraclePriceXLM;
    signal input minHealthFactor;
    signal input currentTimestamp;
    signal output commitmentHash;

    component maturityCheck = GreaterThan(64);
    maturityCheck.in[0] <== bondMaturityDate;
    maturityCheck.in[1] <== currentTimestamp;
    maturityCheck.out === 1;

    signal totalCollateralValue;
    totalCollateralValue <== collateralAmount * oraclePriceXLM;

    signal requiredCollateralValueScaled;
    requiredCollateralValueScaled <== requestedLoanXLM * minHealthFactor;

    signal totalCollateralValueScaled;
    totalCollateralValueScaled <== totalCollateralValue * 100;

    component healthCheck = GreaterEqThan(252);
    healthCheck.in[0] <== totalCollateralValueScaled;
    healthCheck.in[1] <== requiredCollateralValueScaled;
    healthCheck.out === 1;

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== collateralAmount;
    poseidon.inputs[1] <== institutionalSecret;
    commitmentHash <== poseidon.out;
}

component main {public [requestedLoanXLM, oraclePriceXLM, minHealthFactor, currentTimestamp]} = RepoHealth();
