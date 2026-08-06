#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Bytes, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidProof = 3,
    DealNotFound = 4,
    DealAlreadyRepaid = 5,
    DealLiquidated = 6,
    NotOverdue = 7,
    InsufficientYldsReserves = 8,
    UnauthorizedRepayer = 9,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    NativeXlmSac,
    /// The YLDS Stellar Asset Contract address. The contract holds a reserve of
    /// YLDS tokens. Users deposit XLM → receive YLDS. On repayment they return
    /// YLDS and receive their XLM back.
    YldsSac,
    Deal(u64),
    DealCounter,
}

/// Persistent state for a single Repo Deal.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DealState {
    /// The user who initiated the deal
    pub borrower: Address,
    /// Amount of XLM deposited by the user (in stroops, 1 XLM = 10_000_000)
    pub deposited_xlm: i128,
    /// Amount of YLDS issued to the user as receipt tokens
    pub issued_ylds: i128,
    /// Interest owed on maturity (1% of deposited XLM, held as XLM in contract)
    pub interest_xlm: i128,
    /// Ledger timestamp after which the deal can be settled / liquidated
    pub maturity_timestamp: u64,
    pub is_repaid: bool,
    pub is_liquidated: bool,
}

#[contract]
pub struct AstraRepo;

#[contractimpl]
impl AstraRepo {
    /// One-time initializer.
    /// `admin`          — privileged address allowed to update reserve parameters.
    /// `native_xlm_sac` — Stellar Asset Contract address for the native XLM SAC.
    /// `ylds_sac`       — Stellar Asset Contract address for the YLDS token SAC.
    pub fn initialize(
        env: Env,
        admin: Address,
        native_xlm_sac: Address,
        ylds_sac: Address,
    ) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::NativeXlmSac, &native_xlm_sac);
        env.storage().persistent().set(&DataKey::YldsSac, &ylds_sac);
        env.storage()
            .persistent()
            .set(&DataKey::DealCounter, &0u64);
        Ok(())
    }

    /// Create a new Repo Deal.
    ///
    /// **Flow:**
    /// 1. User calls this with `xlm_deposit_amount` XLM stroops to lock.
    /// 2. Contract pulls `xlm_deposit_amount` XLM from `borrower` into itself
    ///    using the XLM SAC `transfer` (the user approves this via Freighter).
    /// 3. Contract transfers an equivalent amount of YLDS (1:1 with XLM stroops)
    ///    from its own YLDS reserve pool to `borrower`.
    /// 4. Deal is stored; borrower now holds YLDS as their "receipt token".
    ///
    /// On maturity, the user calls `repay_and_close` to return the YLDS and
    /// receive their XLM back (plus any yield, minus 1% interest fee).
    pub fn create_repo_deal(
        env: Env,
        borrower: Address,
        xlm_deposit_amount: i128,
        proof: Bytes,
        public_signals: Vec<i128>,
    ) -> Result<u64, Error> {
        borrower.require_auth();

        // Validate ZK Proof — in production this calls BN254 pairing host functions
        if !verify_zk_proof(&env, &proof, &public_signals) {
            return Err(Error::InvalidProof);
        }

        // Load stored SAC addresses
        let native_xlm_sac: Address = env
            .storage()
            .persistent()
            .get(&DataKey::NativeXlmSac)
            .ok_or(Error::NotInitialized)?;
        let ylds_sac: Address = env
            .storage()
            .persistent()
            .get(&DataKey::YldsSac)
            .ok_or(Error::NotInitialized)?;

        let xlm_client = token::Client::new(&env, &native_xlm_sac);
        let ylds_client = token::Client::new(&env, &ylds_sac);

        // Verify the contract has enough YLDS reserves to cover this deal
        let contract_addr = env.current_contract_address();
        let ylds_reserve = ylds_client.balance(&contract_addr);
        if ylds_reserve < xlm_deposit_amount {
            return Err(Error::InsufficientYldsReserves);
        }

        // Step 1 — Pull XLM from borrower into the contract as collateral
        xlm_client.transfer(&borrower, &contract_addr, &xlm_deposit_amount);

        // Step 2 — Issue equivalent YLDS from contract reserves to borrower (1:1 ratio)
        let issued_ylds = xlm_deposit_amount;
        ylds_client.transfer(&contract_addr, &borrower, &issued_ylds);

        // 1% interest accrual (denominated in XLM, will be retained on settlement)
        let interest_xlm = xlm_deposit_amount / 100;

        // Persist Deal State
        let mut deal_counter: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::DealCounter)
            .unwrap_or(0);
        deal_counter += 1;
        env.storage()
            .persistent()
            .set(&DataKey::DealCounter, &deal_counter);

        let deal_state = DealState {
            borrower: borrower.clone(),
            deposited_xlm: xlm_deposit_amount,
            issued_ylds,
            interest_xlm,
            maturity_timestamp: env.ledger().timestamp() + 86400, // overnight (24h)
            is_repaid: false,
            is_liquidated: false,
        };

        // Temporary storage — deals expire after ~24h (17280 ledgers ≈ 1 day at 5s/ledger)
        let deal_key = DataKey::Deal(deal_counter);
        env.storage().temporary().set(&deal_key, &deal_state);
        env.storage()
            .temporary()
            .extend_ttl(&deal_key, 17280, 17280);

        Ok(deal_counter)
    }

    /// Repay a deal and release the escrowed XLM back to the borrower.
    ///
    /// **Flow:**
    /// 1. User returns `issued_ylds` YLDS to the contract.
    /// 2. Contract returns `deposited_xlm - interest_xlm` XLM to the borrower.
    ///    (1% interest stays in the contract as protocol revenue).
    pub fn repay_and_close(
        env: Env,
        deal_id: u64,
        borrower: Address,
    ) -> Result<(), Error> {
        borrower.require_auth();

        let deal_key = DataKey::Deal(deal_id);
        let mut deal_state: DealState = env
            .storage()
            .temporary()
            .get(&deal_key)
            .ok_or(Error::DealNotFound)?;

        if deal_state.is_repaid {
            return Err(Error::DealAlreadyRepaid);
        }
        if deal_state.is_liquidated {
            return Err(Error::DealLiquidated);
        }
        if deal_state.borrower != borrower {
            return Err(Error::UnauthorizedRepayer);
        }

        let native_xlm_sac: Address = env
            .storage()
            .persistent()
            .get(&DataKey::NativeXlmSac)
            .ok_or(Error::NotInitialized)?;
        let ylds_sac: Address = env
            .storage()
            .persistent()
            .get(&DataKey::YldsSac)
            .ok_or(Error::NotInitialized)?;

        let xlm_client = token::Client::new(&env, &native_xlm_sac);
        let ylds_client = token::Client::new(&env, &ylds_sac);

        let contract_addr = env.current_contract_address();

        // Step 1 — Pull YLDS back from borrower into the contract (replenishes reserve)
        ylds_client.transfer(&borrower, &contract_addr, &deal_state.issued_ylds);

        // Step 2 — Return XLM to borrower, deducting the 1% interest fee
        let xlm_to_return = deal_state.deposited_xlm - deal_state.interest_xlm;
        xlm_client.transfer(&contract_addr, &borrower, &xlm_to_return);

        deal_state.is_repaid = true;
        env.storage().temporary().set(&deal_key, &deal_state);

        Ok(())
    }

    /// Liquidate an overdue deal.
    /// The contract keeps the escrowed XLM; the issued YLDS are now worthless
    /// and cannot be redeemed. In a full implementation this would trigger a
    /// Dutch auction of the XLM reserves.
    pub fn liquidate_overdue(env: Env, deal_id: u64) -> Result<(), Error> {
        let deal_key = DataKey::Deal(deal_id);
        let mut deal_state: DealState = env
            .storage()
            .temporary()
            .get(&deal_key)
            .ok_or(Error::DealNotFound)?;

        if deal_state.is_repaid {
            return Err(Error::DealAlreadyRepaid);
        }
        if deal_state.is_liquidated {
            return Err(Error::DealLiquidated);
        }

        let current_time = env.ledger().timestamp();
        if current_time <= deal_state.maturity_timestamp {
            return Err(Error::NotOverdue);
        }

        deal_state.is_liquidated = true;
        env.storage().temporary().set(&deal_key, &deal_state);
        env.storage()
            .temporary()
            .extend_ttl(&deal_key, 17280, 17280);

        Ok(())
    }

    /// Read-only: return the current deal state (useful for frontends).
    pub fn get_deal(env: Env, deal_id: u64) -> Result<DealState, Error> {
        env.storage()
            .temporary()
            .get(&DataKey::Deal(deal_id))
            .ok_or(Error::DealNotFound)
    }
}

/// ZK proof verification stub.
/// In production, decode `proof` into G1/G2 BN254 curve points and call
/// `env.crypto().bn254_pairing(...)` (Soroban Protocol 22+).
fn verify_zk_proof(_env: &Env, _proof: &Bytes, _public_signals: &Vec<i128>) -> bool {
    // Groth16 pairing check: e(A, B) = e(alpha, beta) * e(L(x), gamma) * e(C, delta)
    true
}

#[cfg(test)]
mod test;
