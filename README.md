<div align="center">

<!-- HERO BANNER -->
<img src="public/walletconnected.png" alt="Astra App Screenshot - Wallet Connected & Balance Displayed" width="100%" style="border-radius:16px"/>

<br/><br/>

# Astra

### *Zero-Knowledge Tri-Party Repo Protocol for Tokenized Treasuries on Stellar Soroban*

<br/>

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7B2FBE?style=for-the-badge&logo=stellar&logoColor=white)](https://stellar.org)
[![Testnet Live](https://img.shields.io/badge/Testnet-LIVE-22c55e?style=for-the-badge&logo=checkmarx&logoColor=white)](https://lab.stellar.org/r/testnet/contract/CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SnarkJS](https://img.shields.io/badge/SnarkJS-Circom-FFB13B?style=for-the-badge&logo=zk&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br/>

> ### *"Unlock institutional liquidity without compromising portfolio privacy."*
> **Borrow Native XLM against real-world assets with mathematical certainty.**

<br/>

[ Live App](https://astra-seven-gules.vercel.app/)  [ Demo Video](https://www.youtube.com/watch?v=jXnLs0YNRks)  [ Pitch Deck](https://astra-seven-gules.vercel.app/pitchdeck)  [ Community Win]([PLACEHOLDER_WIN_URL])

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
- **Soroban Indexer**  In-memory LRU cache and SQLite Database polling Stellar Horizon for active deals.

---

## Live Protocol Analytics

Astra runs a live indexer that decodes Soroban XDR events directly from the Stellar Testnet into a persistent SQLite database. This powers a real-time, 100% on-chain analytics dashboard showing liquidity growth, active institutions, and health factor distributions.

<div align="center">
  <img src="public/analytics.png" alt="Astra Live Protocol Analytics Dashboard" width="100%" style="border-radius:12px; box-shadow: 0 4px 30px rgba(0, 255, 204, 0.08); border: 1px solid rgba(255, 255, 255, 0.08); margin-top: 15px; margin-bottom: 8px;"/>
  <p align="center"><sub>â†‘ Real-time analytics dashboard â€” TVL growth, health factor distribution, and active institution count.</sub></p>
</div>

<br/>

Every transaction broadcast to the Stellar Testnet is indexed within 10 seconds. The table below shows live `create_repo_deal` invocations decoded directly from Soroban XDR, identifying borrower addresses, collateral amounts, and sequence numbers.

<div align="center">
  <img src="public/transaction.png" alt="Astra Live Transaction Activity â€” Soroban contract invocations on Stellar Testnet" width="100%" style="border-radius:12px; box-shadow: 0 4px 30px rgba(0, 210, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.08); margin-top: 8px; margin-bottom: 8px;"/>
  <p align="center"><sub>â†‘ Live transaction feed â€” <code>create_repo_deal</code> invocations on <a href="https://stellar.expert/explorer/testnet/account/GASPE6ZZRPXJFD43CNABKBUUNNFIVJH6SFDEIQ3FKSVOZ3ICKI66UZ3C">Stellar Expert Testnet</a>. Each row is a borrower creating a collateralized repo position against contract <code>CDNDVKâ€¦UX5US</code>.</sub></p>
</div>

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
| **Contract Address** | `CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2` |
| **Explorer** | [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet/contract/CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2) |
<img src="public/testnet.png" alt="Testnet Deployment Screenshot" width="100%" style="border-radius:12px; margin-top: 1rem;"/>

### Testnet Interactions

| Testnet Address | TxId | Stellar Expert Link |
|---|---|---|
| GAMNNUWG73CJ5A75RWW6NORLBWMHQUMKC4BCEAZ4HYUO2OP35Z63OFGS | 58e197a6b417a58c2ed10611a94e1646a2c5efa46706d131d4fae12d36233dbf | [Link](https://stellar.expert/explorer/testnet/tx/58e197a6b417a58c2ed10611a94e1646a2c5efa46706d131d4fae12d36233dbf) |
| GDRFEQ3XDS2CIG2FUVUEY2RETEUCU7ANFCR3UUK3PJGNKDTQHVWRUKPP | c61032efcece59bbf0ee22832fba9671729784ef46d200201545d7fbabd48f58 | [Link](https://stellar.expert/explorer/testnet/tx/c61032efcece59bbf0ee22832fba9671729784ef46d200201545d7fbabd48f58) |
| GDZLYI7YNUSI7SPCZWVO42AIVSJ7GGS36TBGYDLXDJQG5REA27O3TUGK | 7f30369327c0916029d00561ead9c4dbe171587574c39366f15a6aa5607a4aac | [Link](https://stellar.expert/explorer/testnet/tx/7f30369327c0916029d00561ead9c4dbe171587574c39366f15a6aa5607a4aac) |
| GCQTJD5AXEGNMS5K5JJVFEJAOSDFI7NT6UAQE2XERYRN7RWSH3OQWEGP | e7e65c38b177662d5fb3e48c567fb373d1e861bc6ee4ca5f478f093709bc563b | [Link](https://stellar.expert/explorer/testnet/tx/e7e65c38b177662d5fb3e48c567fb373d1e861bc6ee4ca5f478f093709bc563b) |
| GBYLP5PCFMABRJ2S2GRBKODXNGWG5LXRQMA5EEKVPYM7UKHQH354GSCZ | abcb95dc01aba8198eff5f9cffbddaaecc8dd56de648be1ac6054eed149154b0 | [Link](https://stellar.expert/explorer/testnet/tx/abcb95dc01aba8198eff5f9cffbddaaecc8dd56de648be1ac6054eed149154b0) |
| GDZMTW6ZFYKJJVNE6JQS77EQ2ODT5RGDMZFJZHRY6JPEFF76EIZIBCSX | ef2024ea2a28e22d63ee8d19ab2182f984aba34b458248cc24d51ad24cc6f915 | [Link](https://stellar.expert/explorer/testnet/tx/ef2024ea2a28e22d63ee8d19ab2182f984aba34b458248cc24d51ad24cc6f915) |
| GC2PKWOVMOGUSQMICJKQGBGKIULGIAYFILVTKG7GJESVEC5XARRFYO4T | bd5773b8ac9400b9ceccbe97ba6bf6b5e806e6027ecc2d94a22c1d8bbcce6c74 | [Link](https://stellar.expert/explorer/testnet/tx/bd5773b8ac9400b9ceccbe97ba6bf6b5e806e6027ecc2d94a22c1d8bbcce6c74) |
| GB3XF3UPK5KX57BFSAHW6JHOOMZWUKXN4UHOLZLYYPIQIHYBWADJTJOL | 35f3bcb2583acb3ecf936a38cf7d6a1509c709f70012f10e1c042a13431abe70 | [Link](https://stellar.expert/explorer/testnet/tx/35f3bcb2583acb3ecf936a38cf7d6a1509c709f70012f10e1c042a13431abe70) |
| GD4OH234NGBHVOBTJYLSF4GMFLHLIDIBDDIQ52VVA52MCW373KVWBC6H | 7a54497585b907b468abb63d99626a2cd49dae846ce245b50c26dfa72dee0615 | [Link](https://stellar.expert/explorer/testnet/tx/7a54497585b907b468abb63d99626a2cd49dae846ce245b50c26dfa72dee0615) |
| GBQHLPKVQZ3GUIRP2PENE77K3EVPANBISXVIJDWBM3F3THAKSZ5BOI3L | 93d9bf4c6e156cb6b37fc300b787ea01453d898ef78d918a888d542be5ffa309 | [Link](https://stellar.expert/explorer/testnet/tx/93d9bf4c6e156cb6b37fc300b787ea01453d898ef78d918a888d542be5ffa309) |
| GB2XCONEEARUPPSC6ZYSBZ7NTNZD6S6SQK7JAIKLZDGIDJX2XVRP5WRV | 8c4ab6f407fe003be36ce8a5e2bf17aaf18d95bafe6264f0b2768b792fe7d4c5 | [Link](https://stellar.expert/explorer/testnet/tx/8c4ab6f407fe003be36ce8a5e2bf17aaf18d95bafe6264f0b2768b792fe7d4c5) |
| GDSTVANPTVR6EGDYJRYPUTU6IVL3C3L5VF4OY42E2UIBTFWFAHTGVO7Y | 1318302e3a4dbaf5280d9328aa476c9ad23606a15bc354b2eace4e2bdd9040f9 | [Link](https://stellar.expert/explorer/testnet/tx/1318302e3a4dbaf5280d9328aa476c9ad23606a15bc354b2eace4e2bdd9040f9) |
| GBQGNVB7QFQHETD7VUXKIIQUD33VDWO5KEYPYMS7PTQNYXFKQI2EOBUG | 5f323ae36ac6ef988ba8fc00b08c98c42130df0b7cf9963c1347f42d7c871719 | [Link](https://stellar.expert/explorer/testnet/tx/5f323ae36ac6ef988ba8fc00b08c98c42130df0b7cf9963c1347f42d7c871719) |
| GCS5AMZDGAIZUQA3EDKMIBPSDBWWTBQ3IW77KVDHRALVUT64XZWSMHSW | d4bae80b873e8a4fac3fb7435c6127f597770110f27591f2e93ba169eb9b44cf | [Link](https://stellar.expert/explorer/testnet/tx/d4bae80b873e8a4fac3fb7435c6127f597770110f27591f2e93ba169eb9b44cf) |
| GDBJ7HAG27DP2FMUED6AIQF2G2CUQD32CR53UONBQPHTVJZKZ5XBCZ6E | 9e4efe003eeeffa054cb3f354160d8ca6baaad7a6a897d481e381356f4b42972 | [Link](https://stellar.expert/explorer/testnet/tx/9e4efe003eeeffa054cb3f354160d8ca6baaad7a6a897d481e381356f4b42972) |
| GDO576YDYADV2KT633LICQ3N6JDLG7NVWWEQZ4UBDS2IJ2CGL4IVYZPK | 9aff7be4b48e7db8ddaf149ce1f13335a63c62cb8fb2fcdc96959ca841f1f372 | [Link](https://stellar.expert/explorer/testnet/tx/9aff7be4b48e7db8ddaf149ce1f13335a63c62cb8fb2fcdc96959ca841f1f372) |
| GCWTNOXMCIATCWQ27JLRKVT3N2OTAQEXVR6HDCAC5TIJVCEPJIYGXRZ4 | 28739e751e6e849e078abbb12339dd10cfa0980a67c976e7eeecc0d0c226936a | [Link](https://stellar.expert/explorer/testnet/tx/28739e751e6e849e078abbb12339dd10cfa0980a67c976e7eeecc0d0c226936a) |
| GAFLHCSIYCIL45OBOVR3IRTX5FCSBYZ3W3T6IARDRYZ2XVRLTSF2AGTI | 7b915738231eb621b546cdce55a76437880604292aa55ba2724798dbafab1ea4 | [Link](https://stellar.expert/explorer/testnet/tx/7b915738231eb621b546cdce55a76437880604292aa55ba2724798dbafab1ea4) |
| GDJDMYCB7MTQNOPJ3J3IRVJJBLZGT7H5OHT5GTILO5MZC3LNBJZ3OFCM | 3dc9ecf88a102f801c5ecde25475a17e5db3e52899843236b3d6b9e306df0033 | [Link](https://stellar.expert/explorer/testnet/tx/3dc9ecf88a102f801c5ecde25475a17e5db3e52899843236b3d6b9e306df0033) |
| GASDD3UHMVHSU2KWDL4VMTOUWRRMFMFM7IAT4RD6QCG3P4C5OAQFDJTR | 079a49dc219598a476228e7a462ab2d6f820cc6ccda85f95d4a161950515d0c0 | [Link](https://stellar.expert/explorer/testnet/tx/079a49dc219598a476228e7a462ab2d6f820cc6ccda85f95d4a161950515d0c0) |
| GAV4AMG53JIRBBPU2VPWG6UISY5ZZXKYWWB2YD4TZDHW2KD3VQNRQ3DI | 69e3ce7d2c960b91b8fd821bd9d322cfc5196d668c8f30c761dd56cff8a47066 | [Link](https://stellar.expert/explorer/testnet/tx/69e3ce7d2c960b91b8fd821bd9d322cfc5196d668c8f30c761dd56cff8a47066) |
| GDBZZ7BUO7HQUNORXLFAE34TACBT4ZG7QB75BSSRESRXH22ECAZ5DF2C | 41e546f47f5e6938f4e032a389e2781a7bbe8ab4f223d92afd10450783202d40 | [Link](https://stellar.expert/explorer/testnet/tx/41e546f47f5e6938f4e032a389e2781a7bbe8ab4f223d92afd10450783202d40) |
| GAOEHTOSDS6YO2G7S4AKKNFRVEY47633347JW5EJFQQP2T6XTNTGO2LF | 307fec14ccfe0d03a3fc5c4735a68a2ac3b9c169802a6266a156c7a9b2b3fba6 | [Link](https://stellar.expert/explorer/testnet/tx/307fec14ccfe0d03a3fc5c4735a68a2ac3b9c169802a6266a156c7a9b2b3fba6) |
| GCN4VJGK6PNBVT7ZOEH7SLQYZNIGMXADQQIVGLNBKHADKA6P3PZPD25V | 02af3ada2952317d61a0146241e02a88bab75a17f937f380dca3d8d2a58add7d | [Link](https://stellar.expert/explorer/testnet/tx/02af3ada2952317d61a0146241e02a88bab75a17f937f380dca3d8d2a58add7d) |
| GBLUVNNU2KTVQNIHX3X4EHDVG7WM2JROQWUTAZBHNTQESQMD7VJSWIDL | 0eea732636fa85b64e4e71e35c17d01d6ad1c32e5cba4af8eda29b8b86c1cd84 | [Link](https://stellar.expert/explorer/testnet/tx/0eea732636fa85b64e4e71e35c17d01d6ad1c32e5cba4af8eda29b8b86c1cd84) |
| GBKUHLKD47MS77N5KUK2IRPFUNQGK27WYXXMBV2KTWQY262FFIUSSGLI | f3859777a0ef019aeb99af16221d500e33966a0af84f8c1331666b6e8d20fd26 | [Link](https://stellar.expert/explorer/testnet/tx/f3859777a0ef019aeb99af16221d500e33966a0af84f8c1331666b6e8d20fd26) |
| GBQGL7L2CROICM3TQYIHPXB6O4KV7R4XWI3QOLUBEGSHRX2QURXZGV3F | d9a54a3f799c5a34543abb4e2a16216b412922286d50cfc257e22d9a84843d4d | [Link](https://stellar.expert/explorer/testnet/tx/d9a54a3f799c5a34543abb4e2a16216b412922286d50cfc257e22d9a84843d4d) |
| GD4RUTMGGCCW3J5ZW5FHQ2ZBMZXPPZZSKJKHE56OMLJXQJYE53IKHGF2 | 67b7cf963b5bb727c60126c3292219986d2107036be7dddcd63b28d3459401c1 | [Link](https://stellar.expert/explorer/testnet/tx/67b7cf963b5bb727c60126c3292219986d2107036be7dddcd63b28d3459401c1) |
| GB366JQUL2QBD2TN342S366QAPLGE5L7NFZ73FZI7VHMHQR6GMYVSQFX | 5ad54703905a5e3bef035efcb8a8b9c581e16532b63cd0804a4c2464a74c177d | [Link](https://stellar.expert/explorer/testnet/tx/5ad54703905a5e3bef035efcb8a8b9c581e16532b63cd0804a4c2464a74c177d) |
| GAVEPUKZIERTS4UDDPX4KJRFKAOTR5K53XRG4RXLAHP3SPZA6X6UC37G | fbffb8e682b77156d1b5930a12ce64c5fcb535c5d906d0df8b9d0f9c4ae1aa6c | [Link](https://stellar.expert/explorer/testnet/tx/fbffb8e682b77156d1b5930a12ce64c5fcb535c5d906d0df8b9d0f9c4ae1aa6c) |
| GCX5TXUHDAQBZXQGRGA2Z6MQGHMCLRTS7PYPHGVCGMXBYSFUZHZQBLUC | 4151660ca67fd00b22791efa3cb2ea316e61eb00551098fc221170f401ef0ca1 | [Link](https://stellar.expert/explorer/testnet/tx/4151660ca67fd00b22791efa3cb2ea316e61eb00551098fc221170f401ef0ca1) |
| GDF6ZLGYKTAJ52UUE75X4IH3B5TGDYMVMOLFYZ7CX2HONHUREG2SQ6W6 | 25a49bfc57d126d8973799603caf6099e214f087b22f37b93733f2602656fde4 | [Link](https://stellar.expert/explorer/testnet/tx/25a49bfc57d126d8973799603caf6099e214f087b22f37b93733f2602656fde4) |
| GBIMKRPX34TCSQ352LWRZBA3VNPBLUEPCRAHNW7P3XIIZRDECGVQCBYF | 702ebd8091be20d281e4f9786aba316c131acedcc46de243fcfbf3148a80b648 | [Link](https://stellar.expert/explorer/testnet/tx/702ebd8091be20d281e4f9786aba316c131acedcc46de243fcfbf3148a80b648) |
| GARFV4B5FPAT3YZLH5DN7FGMBS2HYAO6VFBPQL4EKXHHRCRZNLU5YVIN | cbaefd87fe50621a31193c4aaec9aaa10c0c47d85a70ee721c9bf8047a81b5ed | [Link](https://stellar.expert/explorer/testnet/tx/cbaefd87fe50621a31193c4aaec9aaa10c0c47d85a70ee721c9bf8047a81b5ed) |
| GBMLMMKSSUUUGPRXP2NQ3RP46GBUUAW5NIU4SCXX6FPSUAW7TCS7ANXG | 2322213c1b698fb4ca18a78e4f10bf8f00774fe3b1b468d1f27af19b1b7780ec | [Link](https://stellar.expert/explorer/testnet/tx/2322213c1b698fb4ca18a78e4f10bf8f00774fe3b1b468d1f27af19b1b7780ec) |
| GCTP3VDL22G3RNUIILJBZAR4BQF7WGLSYFFDYGGNQIQMAJCRFUMSQ3WZ | f37938ffd8b2797655b05d2a4a1a2b641bf082a490b6df6a46a5ce0bb33a5d16 | [Link](https://stellar.expert/explorer/testnet/tx/f37938ffd8b2797655b05d2a4a1a2b641bf082a490b6df6a46a5ce0bb33a5d16) |
| GBRVM5DKQ5CG7LZQNVSEEFN2PP3Z2BNQHQ7BQ2HJUY7SF4OZUGCHR3GJ | c288162d092db6abea84e0e90cdee6971d3f5464ffe0ede87f347a2bd2ae9b46 | [Link](https://stellar.expert/explorer/testnet/tx/c288162d092db6abea84e0e90cdee6971d3f5464ffe0ede87f347a2bd2ae9b46) |
| GD5W2YSXIEMV5F57KCI5MNFPUJV4XS5EX4MSLXGQZBKVEK2G2GPZLNLW | 14ca788f0ce1364250c15b16e260a936ae139f3c46a510d6a1304236695e7835 | [Link](https://stellar.expert/explorer/testnet/tx/14ca788f0ce1364250c15b16e260a936ae139f3c46a510d6a1304236695e7835) |
| GCI7Z4V4ABHC7TKJHY4YGNJBMC7JP5A2CJL64DXZHWASGQB5KTL34ODZ | 67ef0ae0960a664f6ba74b9c566134bed4d10518d4b986e79e30a4c4456aa7b6 | [Link](https://stellar.expert/explorer/testnet/tx/67ef0ae0960a664f6ba74b9c566134bed4d10518d4b986e79e30a4c4456aa7b6) |
| GCJ26MA5DZDNFYFLFPUAHL6L6NYAOUT47X4ZM2VBGRVYXX5633B6WZJK | 8e88d84598e408d525e130963cdf317678507ed132818c235bd8bf058772dde2 | [Link](https://stellar.expert/explorer/testnet/tx/8e88d84598e408d525e130963cdf317678507ed132818c235bd8bf058772dde2) |
| GD4UGV7Z3AEVKXNEPPDTOOZM3F36A2Y3TPI3RZKOVLDZAXBNNURYPR2M | 0b17b33b50b95f2d65ecd97944713980f1bc6a1725e2e3e9766c7fe9cd594b01 | [Link](https://stellar.expert/explorer/testnet/tx/0b17b33b50b95f2d65ecd97944713980f1bc6a1725e2e3e9766c7fe9cd594b01) |
| GAQHNOPY5U2DEDXKZ6J4QPLOHNUEAAIDZDHU3TUH2WJXUU3BOTNCDUX3 | cacc35639280646b022bae921ca617b9d9472e804371fb314ec96cd15e448b9b | [Link](https://stellar.expert/explorer/testnet/tx/cacc35639280646b022bae921ca617b9d9472e804371fb314ec96cd15e448b9b) |
| GCZMJ23BZVD66TFFYWRHKLQ3BVZCJ6NWVR2OB4GJIFJRJDMWL3JHY6E4 | c5929dfc0d6b61aad4de93bb5f131152acab2e8a6e6b212720ab0422dd1033c8 | [Link](https://stellar.expert/explorer/testnet/tx/c5929dfc0d6b61aad4de93bb5f131152acab2e8a6e6b212720ab0422dd1033c8) |
| GDWBMMW3C275JUF4CAROOPFDZRZXL62QLEH3M2VF4CFUN32V7O342ST3 | 056e684a80dcb4cb8b8c54fb543971678fb3ad0ba0953d19f061605ca9c5eac2 | [Link](https://stellar.expert/explorer/testnet/tx/056e684a80dcb4cb8b8c54fb543971678fb3ad0ba0953d19f061605ca9c5eac2) |
| GB27TBGEP7CEWRIAWMEQCEOKV6K4GY4UF2HFFKDU2HS464A4DM5YR5VD | a33802c2c75328f909a761092e01fc0830876b97b1ceeb2adac9e090202566e0 | [Link](https://stellar.expert/explorer/testnet/tx/a33802c2c75328f909a761092e01fc0830876b97b1ceeb2adac9e090202566e0) |
| GCDYYAWS52IYCGLI6USQEINKFZTKRBTTHUPS676ZTA7TWAPNURDR62VA | 5f6732f1cbec235efb56b24c0cb05e6fa5545015d4999caf4fbd42beaa6f861b | [Link](https://stellar.expert/explorer/testnet/tx/5f6732f1cbec235efb56b24c0cb05e6fa5545015d4999caf4fbd42beaa6f861b) |
| GCDQLUKO7CDDTBI6KDDAKAM74M7PSVPPNLX7CG6ZJXFLNRMEPERGYZ4Y | bbd7b6551ff60b0b8a181c91f886f07bd9d6f4acfc9d5bf1c185bc3a00929b1b | [Link](https://stellar.expert/explorer/testnet/tx/bbd7b6551ff60b0b8a181c91f886f07bd9d6f4acfc9d5bf1c185bc3a00929b1b) |
| GCXZBIM2QJ2S656MELDCVZAJRRJL5MY4ARUNMG6ZOWS2MWEYA42FBWBX | 8130bee3fd34d005ca0d7e40b12501d9dd78bcdf30435ae42b4a69fad1dfa5c5 | [Link](https://stellar.expert/explorer/testnet/tx/8130bee3fd34d005ca0d7e40b12501d9dd78bcdf30435ae42b4a69fad1dfa5c5) |
| GBYBNYD5DFDZ4DGVUO6F4CVCXFED52WZAOE4TC2TWSXSSOLCSWVBQWQM | 244cc82f4a5fbe8f410b52666a17bb5358ef7216d8d81823617761f12d8cfc8a | [Link](https://stellar.expert/explorer/testnet/tx/244cc82f4a5fbe8f410b52666a17bb5358ef7216d8d81823617761f12d8cfc8a) |
| GDJMKCNYV7IBGAXY6KBTX4U2IDNFPPXFJI7VEO7MTRYZIDU46N7HBOH3 | c255ea21ea41531fdd9a79576e91dcc76938e228a34ea45b39826cdf44586476 | [Link](https://stellar.expert/explorer/testnet/tx/c255ea21ea41531fdd9a79576e91dcc76938e228a34ea45b39826cdf44586476) |
| GBJEV7WPUY4AM2C34HID7KVJRI7D3XXIGLQVBLIC3JHCO74LOVRH76CK | 8b4bc99872f2f18c1a7d3c298aa61a2c834472b4c5153d356e195807e9767568 | [Link](https://stellar.expert/explorer/testnet/tx/8b4bc99872f2f18c1a7d3c298aa61a2c834472b4c5153d356e195807e9767568) |
| GAYM5ALFLK7HYRS2UVZTVFQQHPLX7NNBKBIKYMTTMVNUGSSLWDICQCXC | 8966a796eeb814ddcd24837545e8137509e34c0cbebdb86ee9350077a616c0f8 | [Link](https://stellar.expert/explorer/testnet/tx/8966a796eeb814ddcd24837545e8137509e34c0cbebdb86ee9350077a616c0f8) |


---

## Continuous Integration & Deployment (CI/CD)

Astra uses an automated GitHub Actions pipeline for continuous integration and delivery.
The CI/CD pipeline runs Rust Soroban tests, builds the smart contract, compiles the Node.js orchestration engine, and deploys the Next.js frontend and backend using Vercel and Render.

<img src="public/cicd.png" alt="Astra CI/CD Pipeline in GitHub Actions" width="100%" style="border-radius:12px; margin-top: 1rem;"/>

---

## Demo & Links

| | Link |
|---|---|
|  **Live App** | [https://astra-seven-gules.vercel.app/](https://astra-seven-gules.vercel.app/) |
|  **Demo Video** | [https://www.youtube.com/watch?v=jXnLs0YNRks](https://www.youtube.com/watch?v=jXnLs0YNRks) |
|  **Pitch Deck** | [https://astra-seven-gules.vercel.app/pitchdeck](https://astra-seven-gules.vercel.app/pitchdeck) |

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

 **[View Feedback & Data Export](https://docs.google.com/spreadsheets/d/1k0M0O7Sxmf3DgErEpXx5vBHukidAlnZxH7k2hO0c_Ns/edit?usp=sharing)**

### Feedback Summary

Based on the survey data collected, 52 users provided their feedback on the product. The overall sentiment is highly positive, though there is some room for improvement regarding consistency and technical performance. Users rated five key areas on a scale of 1 to 5. The product scored highest in Ease of Use with an average rating of 4.33, closely followed by meeting initial Expectations at 4.27. Overall Quality received a solid 4.15, while Performance & Speed scored 4.08. The lowest-rated category was Reliability, which averaged 3.96, indicating that users experienced some errors or inconsistencies during use.

Out of the 52 respondents, 8 provided specific written feedback detailing areas for improvement. On the UI and UX front, users praised the 3D vault scene but noted that it causes lag on lower-end devices, prompting requests for a toggle to disable animations. Transparency in the deal dashboard was another concern, as users find it difficult to determine exactly when a deal will be liquidated based on current reserves. Additionally, there is a strong demand for a dedicated history tab to easily track old, paid-off, or liquidated Soroban transactions. Performance-wise, users noted that the dashboard does not always update instantly, suggesting a switch to WebSockets for real-time indexing, and requested that the backend be optimized to handle concurrent deal creations faster.

Feedback regarding smart contracts and data management highlighted frustrations with migrating to new contract addresses after bug fixes, leading to heavy requests for in-place upgradable contracts. Users also reported that dormant testnet deals expire or disappear, requiring a new mechanism to recover or restore archived data. Finally, on the authentication side, users expressed fatigue from repeatedly typing wallet passwords and recommended integrating FaceID or phone passkeys to streamline the login and signing process.

**Average Ratings (Scale 1-5):**
- â­ **4.33** â€“ Ease of Use
- â­ **4.27** â€“ Met Initial Expectations
- â­ **4.15** â€“ Overall Quality
- â­ **4.08** â€“ Performance & Speed
- â­ **3.96** â€“ Reliability *(Users experienced occasional errors/inconsistencies)*

**Key Takeaways from Written Feedback (8 Respondents):**
- **UI/UX & Transparency:** The 3D vault scene causes lag on lower-end devices; users requested a toggle to disable animations. They also asked for better transparency on exactly when deals will be liquidated based on current reserves, and a dedicated history tab to track old, paid-off, or liquidated Soroban transactions.
- **Performance:** The dashboard does not always update instantly. Users suggested a switch to WebSockets for real-time indexing and requested backend optimization to handle concurrent deal creations faster.
- **Smart Contracts & Data:** Frustration with migrating to new contract addresses after bug fixes led to heavy requests for in-place upgradable contracts. Furthermore, dormant testnet deals expire or disappear, highlighting the need for a data recovery mechanism.
- **Authentication:** Users expressed fatigue from repeatedly typing wallet passwords and recommended integrating FaceID or phone passkeys to streamline the login and signing process.

### Improvements Built from Feedback

The following V2 improvements were directly built in response to the survey results. Each row maps a user complaint to the shipped fix and its git commit.

| # | User Feedback | Feature Shipped | Commit |
|---|---------------|-----------------|--------|
| 1 | *"Hard to determine when a deal will be liquidated based on current reserves"* | **Liquidation Risk Bar** â€” Dynamic color-coded margin ratio progress bar (green â†’ amber â†’ red) fetching live YLDS reserve data from the Soroban contract via `get_margin_ratio()` | [`8b72a0f`](https://github.com/PrinceDale99/Astra/commit/8b72a0f) |
| 2 | *"3D vault scene causes lag on lower-end devices"* | **Lite Mode Toggle** â€” Header button to completely unmount the Three.js canvas and replace it with a lightweight CSS + SVG placeholder. Auto-activates on `prefers-reduced-motion` OS setting | [`bf0e92c`](https://github.com/PrinceDale99/Astra/commit/bf0e92c) |
| 3 | *"Strong demand for a dedicated history tab for old/liquidated transactions"* | **Deal History Page** â€” Paginated `/history` page with filter tabs (All / Repaid / Liquidated), borrower address search, and persistent SQLite-backed `deal_history` table | [`f9325af`](https://github.com/PrinceDale99/Astra/commit/f9325af) |
| 4 | *"Dashboard does not always update instantly"* | **WebSocket Real-Time Indexer** â€” Replaced 10s polling loop with a WebSocket broadcast server; frontend `useRealtimeDeals` hook merges live events without full re-fetch. Green `â— LIVE` badge on analytics page | [`f6bc78e`](https://github.com/PrinceDale99/Astra/commit/f6bc78e) |
| 5 | *"Frustration migrating to new contract addresses after bug fixes"* | **Upgradeable Contract** â€” `upgrade()` function using `env.deployer().update_current_contract_wasm()` replaces WASM bytecode in-place. Contract address `CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2` is **permanent** across all future upgrades | [`fc56e41`](https://github.com/PrinceDale99/Astra/commit/fc56e41) |
| 6 | *"Dormant testnet deals expire or disappear"* | **State Archival + Restore Deal** â€” Switched `DealState` from `temporary()` to `persistent()` storage with 30-day TTL. Added `restore_deal()` contract function and amber `âš  RESTORE DEAL` button on the frontend for archived deal recovery | [`981b31f`](https://github.com/PrinceDale99/Astra/commit/981b31f) |
| 7 | *"Fatigue from repeatedly typing wallet passwords"* | **Secp256r1 Passkey Auth** â€” `register_passkey()` contract function stores WebAuthn P-256 credentials on-chain. Frontend `usePasskey` hook triggers OS-native FaceID / TouchID / Windows Hello for deal authorization instead of typed passwords | [`66b2c6e`](https://github.com/PrinceDale99/Astra/commit/66b2c6e) |
| 8 | *"Concurrent deal creations under load"* | **Parallel Event Indexer** â€” Backend now processes batches of Soroban events concurrently via `Promise.all`, replacing sequential `forEach` iteration | [`d551195`](https://github.com/PrinceDale99/Astra/commit/d551195) |

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

<img src="public/cargotest.png" alt="Cargo Test Output showing passing tests" width="100%" style="border-radius:12px; margin-top: 1rem; margin-bottom: 1rem;"/>

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
2. **Flexible Wallet Integrations**  Seamless wallet connectivity standard for the Stellar ecosystem via WalletConnect or Freighter.

<div align="center">
  <img src="public/wallet.png" alt="Astra Wallet Options - Freighter and WalletConnect" width="60%" style="border-radius:12px; margin: 1rem 0;"/>
</div>

3. **Parallax Feedback**  Visual confirmation of on-chain states via the interactive 3D WebGL background.

### Mobile Responsive UI
Astra is fully optimized for mobile browsers, ensuring institutional and retail users can access their repos on the go without compromising the interactive 3D experience or functionality.

<div align="center">
  <img src="public/mobile.png" alt="Astra Mobile Responsive Interface" width="40%" style="border-radius:12px; margin: 1rem 0;"/>
</div>

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

