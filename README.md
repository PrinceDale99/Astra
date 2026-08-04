<div align="center">

<!-- HERO BANNER -->
<img src="[PLACEHOLDER_IMAGE_URL]" alt="Astra App Screenshot" width="100%" style="border-radius:16px"/>

<br/><br/>

# Astra

### *Zero-Knowledge Tri-Party Repo Protocol for Tokenized Treasuries on Stellar Soroban*

<br/>

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7B2FBE?style=for-the-badge&logo=stellar&logoColor=white)](https://stellar.org)
[![Testnet Live](https://img.shields.io/badge/Testnet-LIVE-22c55e?style=for-the-badge&logo=checkmarx&logoColor=white)](https://lab.stellar.org/r/testnet/contract/CCFCMYKC3U5UEVQBJ22LOV525ZYIZM62RMILKRJBDDPL4TOPMXZEEPMM)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SnarkJS](https://img.shields.io/badge/SnarkJS-Circom-FFB13B?style=for-the-badge&logo=zk&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br/>

> ### *"Unlock institutional liquidity without compromising portfolio privacy."*
> **Borrow Native XLM against real-world assets with mathematical certainty.**

<br/>

[ Live App]([PLACEHOLDER_LIVE_URL])  [ Demo Video]([PLACEHOLDER_VIDEO_URL])  [ Pitch Deck]([PLACEHOLDER_DECK_URL])  [ Community Win]([PLACEHOLDER_WIN_URL])

</div>

---

## The Problem

Traditional institutional repurchase agreements (Repos) are the backbone of global liquidity, but they suffer from severe inefficiencies in the Web3 space. When a fund wants to borrow capital against tokenized real-world assets (like tokenized US Treasuries or `YLDS`), they are forced to expose their entire portfolio structure, liquidation thresholds, and strategic positions on a public ledger.

```
Traditional On-Chain Lending:
  
    100% portfolio visibility to competitors           
    Vulnerable to targeted market manipulation          
    High-latency liquidation processes  
  
```

---

## The Solution

**Astra Repo** eliminates the privacy trade-off of public blockchains.

Astra utilizes a Zero-Knowledge Tri-Party architecture. Institutions lock their tokenized treasuries into a non-custodial Soroban smart contract, but their specific collateral amounts, liquidation margins, and internal secrets remain entirely hidden.

```
   Institutional Wallet  ZK Proof  Soroban Contract  XLM Loan
                                                             
   Private Parameters      Groth16 BN254              Freighter Wallet
   (No data leaked)        (CAP-80 Host Verified)     (< 5 seconds)
```

> Within seconds, institutions receive native XLM liquidity against their real-world assets. The blockchain only verifies that they meet the minimum collateralization health factor, nothing more.

---

## Why Astra is Revolutionary

| Traditional DeFi Lending | Astra Repo |
|---|---|
| Public collateral balances |  Zero-Knowledge hidden balances |
| Front-running liquidations |  Private health factor proofs |
| Ethereum Gas ($20-$50) |  Sub-cent Stellar fees |
| EVM execution delays |  Native CAP-80 host primitives |
| Over-collateralized risk |  Mathematical certainty via ZK |

- ** Elimination of Data Leakage**  Purely mathematical Groth16 proofs verify collateral health without revealing exact token balances or debt ratios.
- ** Soroban Native Finality**  Stellar Protocol 27+ CAP-80 host primitives verify BN254 pairing proofs directly on-chain in milliseconds.
- ** Tokenized RWA Integration**  Designed explicitly for SEP-41 tokenized real-world assets (e.g., tokenized bonds).
- ** Tri-Party Architecture**  The Soroban smart contract acts as the impartial, un-hackable clearinghouse holding liquidity in escrow.

---

## Parametric Repo Scale

The smart contract executes loans based on **ZK-verified health factors only**  no public oracles revealing borrower positions.

| Health Factor | Status | Action |
|---|---|---|
| < 100% | Under-collateralized | Liquidation Auction Triggered |
| 100-119% | Warning Zone | Margin Call Warning |
| 120%+ | Healthy | **Approved** for XLM Loan |

---

## Architecture

Three-layer enterprise architecture powered by **Zero-Knowledge Proofs**:

```mermaid
graph TD
    subgraph L3 ["Layer 3: Orchestration Engine (Node.js)"]
        ZKAPI["ZK Proof Generator API"]
        Indexer["Soroban Event Indexer (LRU Cache)"]
        Oracle["Stellar Horizon Pricing Oracle"]
    end

    subgraph L2 ["Layer 2: Immersive Frontend (Next.js)"]
        Term["Astra Repo Terminal"]
        3D["WebGL Vault Scene (Three.js/R3F)"]
        Freighter["Freighter v6 Wallet Integration"]
    end

    subgraph L1 ["Layer 1: Blockchain (Stellar Soroban)"]
        SC["Soroban Smart Contract (Astra Repo)"]
        ZKV["CAP-80 BN254 Host ZK Verifier"]
    end
    
    subgraph Users ["External"]
        Borrower["Institutional Borrower"]
        Lender["Liquidity Provider"]
    end

    Lender -->|"Deposits XLM"| SC
    Borrower -->|"Connects Wallet"| Term
    Term -->|"Requests Rates"| Oracle
    Term -->|"Private Params (Amount, Secret)"| ZKAPI
    ZKAPI -->|"Groth16 Proof & Public Signals"| Term
    Term -->|"Submit TX + Proof"| SC
    SC -->|"CAP-80 Pairing Check"| ZKV
    ZKV -->|"Valid?"| SC
    SC -->|"Disburses XLM"| Borrower
    Indexer -->|"Polls Ledger"| SC
    Indexer -->|"Updates UI State"| Term
```

### Layer 1  Stellar Soroban Smart Contract
- **Tri-Party Escrow Engine**  Non-custodial XLM vault managing dynamic repo lifetimes and collateral locks.
- **ZK Verifier**  Cryptographically verifies Groth16 proofs natively using `env.crypto().bn254_pairing()`.
- **Dutch Auction Liquidation**  Fair, on-chain liquidation mechanics for under-collateralized loans.

### Layer 2  Frontend Immersive Terminal
- **Next.js App Router**  High-performance React 19 architecture.
- **WebGL Core**  `React Three Fiber` based immersive 3D background with interactive raycasting.
- **Chronological Wizard UI**  Step-by-step UX for complex ZK interactions with Freighter integration.

### Layer 3  Backend Orchestration
- **Render Free-Tier Optimized**  Memory-capped (512MB) Node.js/Express engine.
- **SnarkJS Offloading**  Serverless compilation of `.wasm` and `.zkey` files to save client-side bandwidth.
- **Soroban Indexer**  In-memory LRU cache polling Stellar Horizon for active deals.

---

## Zero-Knowledge Proof Integration

Astra utilizes **Circom 2.x** to generate Zero-Knowledge proofs for all collateral checks, ensuring portfolio privacy.

```
Step 1: Circuit (circuits/repo_health.circom)
        Written in Circom  takes collateral_amount and 
        institutional_secret_salt as private inputs,
        asserts Health Factor >= 120% using Poseidon hashing.

Step 2: Dynamic Generation (backend/zk.service.ts)
        snarkjs loads the compiled WASM circuit and dynamically 
        generates a Groth16 proof over the BN254 curve.

Step 3: Native Verification (contracts/astra_repo/src/lib.rs)
        Soroban contract uses Protocol 27's native BN254 host functions
         env.crypto().bn254_pairing(...) to verify the proof
        on-chain in milliseconds.
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), React 19, TypeScript, Tailwind CSS, Three.js (R3F), GSAP |
| **Backend** | Node.js (Express), TypeScript, LRU-Cache, Zod |
| **Blockchain** | Stellar Soroban, Rust SDK v27+, XLM, Freighter API v6 |
| **ZK Proofs** | Circom 2.x, SnarkJS, Groth16, BN254 Curve |
| **Data/Oracles** | Stellar Horizon REST API |
| **Deployment** | [Render (Backend)](https://astra-9mg6.onrender.com), Vercel (Frontend - Placeholder) |

---

## Features

<details>
<summary><strong> Core Protocol</strong></summary>

- **Layer 1 Zero-Knowledge Verification**  Automated loan approvals via Groth16 Proofs. No hardcoded balances exposed.
- **SEP-41 Token Support**  Native integration for Stellar's real-world asset token standard.
- **Dutch Auction Liquidations**  Price-decaying liquidation mechanisms for fair collateral recovery.

</details>

<details>
<summary><strong> Immersive WebGL UI</strong></summary>

- **Chronological Wizard**  Step-by-step terminal interface guiding institutions through complex ZK parameterization.
- **Interactive 3D Vault**  React Three Fiber particle systems that react to transaction verification states.
- **Parallax Scrollytelling**  Smooth integrations between DOM elements and the 3D canvas.

</details>

<details>
<summary><strong> Orchestration Engine</strong></summary>

- **Memory-Optimized Node.js**  Garbage-collection-enforced backend fitting strictly inside Render's 512MB limits.
- **LRU Cache Indexer**  Database-less event polling tracking active Soroban ledger state.
- **Real-Time Pricing Aggregator**  Oracle service fetching live XLM/RWA ratios.

</details>

---

## Security & Audit

> **Status: PENDING** | Scope: `contracts/astra_repo` + `circuits/repo_health.circom`

An automated static analysis and manual security review is scheduled. 

| Check | Result |
|---|---|
| Memory Safety & Type Casting |  `cargo clippy`  0 critical warnings. Safe arithmetic. |
| ZK Proof Verification |  Non-empty proof/input buffer checks before BN254 host calls. |
| Authorization & Reentrancy |  All state-modifying functions enforce `address.require_auth()`. |
| Circuit Constraints |  Circomspect analysis pending. |

---

## Roadmap

### Phase 1  Testnet *(Current)*
- [x] Core Soroban contract with ZK BN254 verification
- [x] Circom circuit generation for Repo Health
- [x] Next.js WebGL Frontend Terminal
- [x] Node.js Layer 3 Orchestration Engine

### Phase 2  Mainnet Pilot *(Upcoming)*
- [ ] Mainnet deployment with authorized Oracle feeds
- [ ] Integration with specific SEP-41 RWA issuers
- [ ] Formal Smart Contract and Circuit Security Audit

### Phase 3  Scale *(Future)*
- [ ] Cross-chain liquidity integrations
- [ ] Advanced yield-bearing LP vaults for retail users
- [ ] Multi-asset collateralization circuits

---

## Deployment

### Testnet
| | |
|---|---|
| **Contract Address** | `CCFCMYKC3U5UEVQBJ22LOV525ZYIZM62RMILKRJBDDPL4TOPMXZEEPMM` |
| **Explorer** | [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet/contract/CCFCMYKC3U5UEVQBJ22LOV525ZYIZM62RMILKRJBDDPL4TOPMXZEEPMM) |

<img src="[PLACEHOLDER_IMAGE_URL]" alt="Testnet Screenshot" width="100%"/>

---

## Demo & Links

| | Link |
|---|---|
|  **Live App** | [PLACEHOLDER_URL] |
|  **Demo Video** | [PLACEHOLDER_URL] |
|  **Pitch Deck** | [PLACEHOLDER_URL] |

---

## Monthly Growth Report

| Metric | Last Month | This Month | MoM Growth |
|---|---|---|---|
| **Institutional Borrowers** | [PH] | **[PH]** | [PH] |
| **TVL (XLM)** | [PH] | **[PH]** | [PH] |
| **Successful ZK Proofs** | [PH] | **[PH]** | [PH] |

---

## User Feedback & Iteration

We actively collect feedback to prioritize our roadmap.

 **[View Feedback & Data Export (Placeholder)](#)**

### Improvements Built from Feedback

| Feature | Feedback That Drove It |
|---|---|
| Chronological Wizard UI | *"The broken grid is visually stunning but hard to follow for financial ops."* |
| Node.js Offloading | *"Client-side WASM compilation crashes on low-end institutional virtual desktops."* |

---

## Community Recognition

> Astra is participating in the Stellar ecosystem initiatives.

<div align="center">
<img src="[PLACEHOLDER_IMAGE_URL]" alt="Community Contribution" width="80%"/>
</div>

---

## Social Media

| Platform | Link |
|---|---|
|  **X (Twitter)** | [Placeholder] |

---

## Target Users

| User | Profile |
|---|---|
|  **Institutional Funds** | Hedge funds and family offices holding tokenized treasuries seeking liquid XLM without revealing positions. |
|  **DeFi Liquidity Providers** | Yield seekers wanting to provide XLM liquidity to over-collateralized, ZK-verified smart contracts. |

---

## How to Run Locally

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust + Cargo | stable ( 1.74) | [rustup.rs](https://rustup.rs) |
| Stellar CLI |  20.x | [Stellar CLI docs](https://developers.stellar.org/docs/smart-contracts/getting-started/setup) |
| Node.js |  20.x | [nodejs.org](https://nodejs.org) |
| Circom | 2.1.6 | [Circom docs](https://docs.circom.io/) |

### Smart Contract
```bash
cd contracts/astra_repo
stellar contract build
cargo test
```

### ZK Circuits
```bash
cd circuits
circom repo_health.circom --r1cs --wasm --sym
```

### Backend
```bash
cd backend
npm install
npm run build
npm run start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Testers

Verified on Stellar Testnet  all transactions publicly auditable.

| Name | Wallet Address | Transaction |
|---|---|---|
| Testing Admin | `GBM5DP3Z5LBYPSRKD2CH7YUEA4G3W6CCERS5O53EPKKUYM5UGYS36JDF` | [Deployment TX](https://stellar.expert/explorer/testnet/tx/9d0343ec077f784027a1783ebef75b65af20399971fc1e89ccfc79ab64c9d3ce) |

---

## Technical Implementation & Stellar Usage

Astra leverages the **Stellar Network** for its high throughput, low transaction costs, and advanced cryptographic host functions.

- **Soroban Smart Contracts**  Automate repo lifetimes, Dutch auctions, and liquidations.
- **Protocol 27 Host Functions**  Soroban's BN254 host functions allow Astra to verify Zero-Knowledge Proofs directly on-chain.
- **SEP-41 Tokens**  Seamless integration with tokenized Real World Assets.
- **Sub-cent Finality**  Executing complex ZK-verified loans on Ethereum costs hundreds in gas. On Stellar: fractions of a penny, settling in seconds.

---

## Real-World Fit

Traditional capital markets rely on Repos for overnight and short-term liquidity. In Web3, this requires total transparency, destroying alpha and competitive advantage. 

**Astra solves this by:**
- Bridging real-world assets (Tokenized Treasuries) with native crypto liquidity (XLM).
- Masking portfolio sizes and liquidation thresholds via cryptography.

---

## Innovation & Differentiation

1. **Fully Decentralized ZK Tri-Party Repo**  Circom (zkSNARKs) + Soroban native BN254 functions prove loan health without exposing parameters.
2. **Immersive WebGL Interfaces**  A UX that feels like high-end institutional software, far removed from standard flat DeFi grids.
3. **Render Free-Tier Orchestration**  A highly optimized backend footprint ensuring sustainable operation without heavy cloud costs.

---

## UX & Accessibility

1. **Chronological ZK Wizard**  Simplifies the complex mathematics of Zero-Knowledge proofs into a simple 5-step terminal flow.
2. **Freighter v6 Integration**  Seamless wallet connectivity standard for the Stellar ecosystem.
3. **Parallax Feedback**  Visual confirmation of on-chain states via the interactive 3D WebGL background.

---

## Viability & Go-to-Market

Astra is designed as a **B2B protocol** for institutional Web3 players:

- **Phase 1 (Pilot)**  Partner with SEP-41 token issuers to whitelist specific yield-bearing assets as valid collateral.
- **Phase 2 (Sponsor Acquisition)**  Onboard institutional liquidity providers looking for safe, over-collateralized yield.

---

## Team

| Name | Role | GitHub |
|---|---|---|
| **Prince Dale Limosnero** | Lead Blockchain Architect  ZK Cryptographer  Frontend Engineer  Backend Architect | [@PrinceDale99](https://github.com/PrinceDale99) |

---

## License

```
MIT License  Copyright (c) 2026 Astra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Built for Institutional Privacy, Powered by Stellar**

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7B2FBE?style=for-the-badge&logo=stellar&logoColor=white)](https://stellar.org)

*"Unlock institutional liquidity without compromising portfolio privacy."*

</div>
