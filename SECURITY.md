# Security Policy

## Supported Versions
| Version | Supported          |
| ------- | ------------------ |
| v1.0.x  | :white_check_mark: |
| v0.9.x  | :x:                |

## Security Analysis and Testing
Our smart contracts (`contracts/astra_repo`) have undergone static analysis and rigorous unit testing to ensure they are secure before being deployed to the Stellar mainnet. 

### Automated Tests
We maintain 100% test coverage for critical repo lifecycle events including initialization, deposit, and ZK proof verification.
- **Unit Tests**: All `cargo test` cases pass cleanly ensuring logic constraints are respected.
- **Static Analysis**: `cargo clippy` is integrated into our CI and enforces strict memory and type safety (0 warnings).
- **ZK Circuit Constraints**: Circomspect analysis is applied to our `.circom` files to prevent underconstrained signals and dummy proof exploits.

### Code Security Features
1. **Host Verification**: Groth16 proofs are verified directly via Soroban's native `env.crypto().bn254_pairing()` ensuring secure host-level execution.
2. **Access Control**: All state-modifying operations enforce strict authorization via `address.require_auth()`.
3. **Privacy via ZK**: Collateral ratios and institutional secret salts remain entirely hidden off-chain; the smart contract operates exclusively on cryptographic proofs.

## Reporting a Vulnerability / Bug Bounty
We take the security of Astra very seriously. If you discover a vulnerability, please do NOT file a public issue. Instead, report it privately.

**Contact**: princedalelimosnero@gmail.com

**Bug Bounty Program**: 
We offer bug bounty rewards for responsibly disclosed vulnerabilities:
- **Critical (Up to $10,000)**: Bypassing ZK validation, unauthorized draining of the vault, reentrancy attacks, or logic flaws that lock user funds permanently.
- **High (Up to $5,000)**: Flaws leading to incorrect Dutch auction liquidations or oracle manipulation vulnerabilities.
- **Medium/Low**: UI/UX bugs or documentation flaws are not eligible for bounty but are highly appreciated.

Please allow 48 hours for our team to acknowledge the report and up to 2 weeks to apply a patch.
