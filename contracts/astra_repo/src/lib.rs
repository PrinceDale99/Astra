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
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    NativeXlmSac,
    Deal(u64),
    DealCounter,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DealState {
    pub borrower: Address,
    pub collateral_token: Address,
    pub collateral_amount: i128,
    pub borrowed_xlm: i128,
    pub repayment_due_timestamp: u64,
    pub is_repaid: bool,
    pub is_liquidated: bool,
}

#[contract]
pub struct AstraRepo;

#[contractimpl]
impl AstraRepo {
    pub fn initialize(env: Env, admin: Address, native_xlm_sac: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        
        // Persistent Storage: Global configurations
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::NativeXlmSac, &native_xlm_sac);
        env.storage().persistent().set(&DataKey::DealCounter, &0u64);
        Ok(())
    }

    pub fn create_repo_deal(
        env: Env,
        borrower: Address,
        collateral_token: Address,
        collateral_amount: i128,
        borrow_xlm_amount: i128,
        proof: Bytes,
        public_signals: Vec<i128>,
    ) -> Result<u64, Error> {
        borrower.require_auth();

        // Validate ZK Proof
        if !verify_zk_proof(&env, &proof, &public_signals) {
            return Err(Error::InvalidProof);
        }

        // Lock Collateral from borrower to contract
        let collateral_client = token::Client::new(&env, &collateral_token);
        collateral_client.transfer(&borrower, &env.current_contract_address(), &collateral_amount);

        // Transfer Borrowed XLM from contract to borrower
        let native_xlm_sac: Address = env
            .storage()
            .persistent()
            .get(&DataKey::NativeXlmSac)
            .ok_or(Error::NotInitialized)?;
        let xlm_client = token::Client::new(&env, &native_xlm_sac);
        xlm_client.transfer(&env.current_contract_address(), &borrower, &borrow_xlm_amount);

        // Save Deal State to Temporary Storage
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
            collateral_token,
            collateral_amount,
            borrowed_xlm: borrow_xlm_amount,
            repayment_due_timestamp: env.ledger().timestamp() + 86400, // overnight repo
            is_repaid: false,
            is_liquidated: false,
        };

        let deal_key = DataKey::Deal(deal_counter);
        // Temporary Storage for overnight short-lived deal
        env.storage().temporary().set(&deal_key, &deal_state);
        env.storage().temporary().extend_ttl(&deal_key, 17280, 17280);

        Ok(deal_counter)
    }

    pub fn repay_and_release(env: Env, deal_id: u64, borrower: Address) -> Result<(), Error> {
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
            return Err(Error::DealNotFound);
        }

        // Dummy interest calculation
        let interest = deal_state.borrowed_xlm / 100;
        let total_repayment = deal_state.borrowed_xlm + interest;

        let native_xlm_sac: Address = env
            .storage()
            .persistent()
            .get(&DataKey::NativeXlmSac)
            .ok_or(Error::NotInitialized)?;
        let xlm_client = token::Client::new(&env, &native_xlm_sac);
        
        // Transfer XLM repayment from borrower to contract
        xlm_client.transfer(&borrower, &env.current_contract_address(), &total_repayment);

        // Release collateral back to borrower
        let collateral_client = token::Client::new(&env, &deal_state.collateral_token);
        collateral_client.transfer(
            &env.current_contract_address(),
            &borrower,
            &deal_state.collateral_amount,
        );

        deal_state.is_repaid = true;
        env.storage().temporary().set(&deal_key, &deal_state);

        Ok(())
    }

    pub fn liquidate_dutch_auction(env: Env, deal_id: u64) -> Result<(), Error> {
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
        if current_time <= deal_state.repayment_due_timestamp {
            return Err(Error::NotOverdue);
        }

        // Mark as liquidated, actual dutch auction logic would execute via an auction handler
        deal_state.is_liquidated = true;
        env.storage().temporary().set(&deal_key, &deal_state);
        env.storage().temporary().extend_ttl(&deal_key, 17280, 17280);

        Ok(())
    }
}

/// Verification routine to evaluate the Groth16 BN254 proof payload.
/// Uses CAP-80 host primitives on Soroban.
fn verify_zk_proof(_env: &Env, _proof: &Bytes, _public_signals: &Vec<i128>) -> bool {
    // Protocol 26+ native host function logic for BN254 curve pairing checks.
    // e(A, B) = e(alpha, beta) * e(L(x), gamma) * e(C, delta)
    // 
    // In actual deployment, one would decode the G1 and G2 elements from `_proof` 
    // and invoke `env.crypto().bn254_pairing(...)` or similar primitive.
    //
    // For Poseidon hashing verification:
    // env.crypto().poseidon(_public_signals[...])
    true
}

#[cfg(test)]
mod test;

