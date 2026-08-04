#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Bytes, Env, Vec,
};

fn setup_test() -> (Env, AstraRepoClient, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths(); // Bypass auth for tests

    let contract_id = env.register_contract(None, AstraRepo);
    let client = AstraRepoClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    
    // Mock native XLM token
    let native_xlm_sac_id = env.register_stellar_asset_contract(admin.clone());
    let native_xlm_sac = native_xlm_sac_id.clone();
    
    // Mock Collateral token
    let collateral_token_id = env.register_stellar_asset_contract(admin.clone());
    let collateral_token = collateral_token_id.clone();

    // Mint some XLM to the contract
    let xlm_client = token::AdminClient::new(&env, &native_xlm_sac_id);
    xlm_client.mint(&client.address, &1_000_000_000);

    // Initialize
    client.initialize(&admin, &native_xlm_sac);

    (env, client, admin, native_xlm_sac, collateral_token)
}

#[test]
fn test_create_and_repay_deal() {
    let (env, client, admin, native_xlm_sac, collateral_token) = setup_test();
    let borrower = Address::generate(&env);

    // Mint collateral to borrower
    let col_admin_client = token::AdminClient::new(&env, &collateral_token);
    col_admin_client.mint(&borrower, &100_000);

    let xlm_token_client = token::Client::new(&env, &native_xlm_sac);
    let col_token_client = token::Client::new(&env, &collateral_token);

    // Borrower creates a deal
    env.ledger().set_timestamp(1000);
    let proof = Bytes::new(&env);
    let public_signals = Vec::new(&env);
    
    let deal_id = client.create_repo_deal(
        &borrower,
        &collateral_token,
        &50_000,
        &10_000,
        &proof,
        &public_signals,
    );

    assert_eq!(deal_id, 1);
    assert_eq!(col_token_client.balance(&borrower), 50_000);
    assert_eq!(col_token_client.balance(&client.address), 50_000);
    assert_eq!(xlm_token_client.balance(&borrower), 10_000);

    // Borrower repays 
    // Wait for timestamp a little bit but before due
    env.ledger().set_timestamp(1500);

    // Give borrower some extra XLM to pay interest (10_000 + 1% = 10_100)
    let xlm_admin_client = token::AdminClient::new(&env, &native_xlm_sac);
    xlm_admin_client.mint(&borrower, &100);

    client.repay_and_release(&deal_id, &borrower);

    // Check balances
    assert_eq!(col_token_client.balance(&borrower), 100_000); // Got collateral back
    assert_eq!(col_token_client.balance(&client.address), 0);
    assert_eq!(xlm_token_client.balance(&borrower), 0); // Paid 10_100
}

#[test]
fn test_liquidate_late_repayment() {
    let (env, client, admin, native_xlm_sac, collateral_token) = setup_test();
    let borrower = Address::generate(&env);

    // Mint collateral to borrower
    let col_admin_client = token::AdminClient::new(&env, &collateral_token);
    col_admin_client.mint(&borrower, &100_000);

    env.ledger().set_timestamp(1000);
    
    let proof = Bytes::new(&env);
    let public_signals = Vec::new(&env);
    
    let deal_id = client.create_repo_deal(
        &borrower,
        &collateral_token,
        &50_000,
        &10_000,
        &proof,
        &public_signals,
    );

    // Fast forward ledger timestamp past the due date (1000 + 86400 = 87400)
    // "What happens if a borrower tries to repay 1 second after the expiration timestamp?"
    env.ledger().set_timestamp(87401);

    // Borrower tries to repay, which might succeed depending on if it's liquidated yet.
    // In our design, liquidation must be triggered. Let's trigger liquidation first.
    client.liquidate_dutch_auction(&deal_id);

    // Give borrower extra XLM just in case they try to pay
    let xlm_admin_client = token::AdminClient::new(&env, &native_xlm_sac);
    xlm_admin_client.mint(&borrower, &100);

    // Now borrower tries to repay but should fail with DealLiquidated
    let res = client.try_repay_and_release(&deal_id, &borrower);
    assert!(res.is_err());
    assert_eq!(res.err().unwrap().unwrap(), Error::DealLiquidated);
}

#[test]
fn test_oracle_drop_liquidation() {
    // "What happens if the borrower's collateral is liquidated while the oracle drops 50%?"
    // In the current logic, Oracle prices are validated via the ZK Proof during creation.
    // An external keeper checks prices and if health drops, they'd trigger liquidation early.
    // We haven't implemented pre-expiration price drop liquidation (requires feeding oracle prices to contract).
    // But we can simulate standard liquidation mechanics.
    let (env, client, admin, native_xlm_sac, collateral_token) = setup_test();
    let borrower = Address::generate(&env);
    
    let col_admin_client = token::AdminClient::new(&env, &collateral_token);
    col_admin_client.mint(&borrower, &100_000);
    env.ledger().set_timestamp(1000);
    
    let deal_id = client.create_repo_deal(
        &borrower,
        &collateral_token,
        &50_000,
        &10_000,
        &Bytes::new(&env),
        &Vec::new(&env),
    );

    env.ledger().set_timestamp(90000); // Past due
    client.liquidate_dutch_auction(&deal_id);

    // At this point, the contract holds 50_000 collateral and the borrower kept the 10_000 XLM.
    // An external Dutch auction contract would claim the collateral from `client.address`.
    let col_token_client = token::Client::new(&env, &collateral_token);
    assert_eq!(col_token_client.balance(&client.address), 50_000);
}
