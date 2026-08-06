#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Bytes, Env, Vec,
};

/// Sets up the test environment with:
/// - A deployed AstraRepo contract
/// - A mock native XLM SAC (funded to the contract for loan reserves)
/// - A mock YLDS SAC (funded to the contract as the receipt token reserve)
fn setup_test() -> (Env, AstraRepoClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths(); // Bypass auth for unit tests

    let contract_id = env.register_contract(None, AstraRepo);
    let client = AstraRepoClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    // Mock native XLM SAC — the contract holds XLM as its loan reserve
    let native_xlm_sac = env.register_stellar_asset_contract(admin.clone());
    let xlm_admin = token::AdminClient::new(&env, &native_xlm_sac);
    // Fund the contract with XLM so it can return XLM on repayment
    xlm_admin.mint(&client.address, &100_000_000_000); // 10,000 XLM

    // Mock YLDS SAC — the contract holds YLDS as its receipt-token reserve
    let ylds_sac = env.register_stellar_asset_contract(admin.clone());
    let ylds_admin = token::AdminClient::new(&env, &ylds_sac);
    // Fund the contract with 3,000,000 YLDS (in stroops: × 10_000_000)
    ylds_admin.mint(&client.address, &3_000_000_0_000_000_i128);

    // Initialize contract with both SAC addresses
    client.initialize(&admin, &native_xlm_sac, &ylds_sac);

    (env, client, admin, native_xlm_sac, ylds_sac)
}

#[test]
fn test_create_deal_and_repay() {
    let (env, client, _admin, native_xlm_sac, ylds_sac) = setup_test();
    let borrower = Address::generate(&env);

    let xlm_client = token::Client::new(&env, &native_xlm_sac);
    let ylds_client = token::Client::new(&env, &ylds_sac);
    let xlm_admin = token::AdminClient::new(&env, &native_xlm_sac);

    // Fund borrower with XLM to deposit
    let deposit_amount: i128 = 50_000_0_000_000; // 5,000 XLM
    xlm_admin.mint(&borrower, &deposit_amount);

    env.ledger().set_timestamp(1_000);

    let proof = Bytes::new(&env);
    let public_signals = Vec::new(&env);

    // Borrower deposits XLM → should receive equivalent YLDS
    let deal_id = client.create_repo_deal(&borrower, &deposit_amount, &proof, &public_signals);
    assert_eq!(deal_id, 1);

    // After deal: borrower has 0 XLM (deposited) and deposit_amount YLDS (received)
    assert_eq!(xlm_client.balance(&borrower), 0);
    assert_eq!(ylds_client.balance(&borrower), deposit_amount);

    // Contract holds the deposited XLM
    assert_eq!(xlm_client.balance(&client.address), 100_000_000_000 + deposit_amount);

    // Settle deal: borrower returns YLDS → gets XLM back (minus 1% interest)
    env.ledger().set_timestamp(1_500); // before maturity

    let interest = deposit_amount / 100;
    let expected_xlm_return = deposit_amount - interest;

    client.repay_and_close(&deal_id, &borrower);

    // Borrower received XLM back minus 1% interest
    assert_eq!(xlm_client.balance(&borrower), expected_xlm_return);
    // Borrower's YLDS are gone (returned to contract)
    assert_eq!(ylds_client.balance(&borrower), 0);
}

#[test]
fn test_liquidation_of_overdue_deal() {
    let (env, client, _admin, native_xlm_sac, ylds_sac) = setup_test();
    let borrower = Address::generate(&env);

    let xlm_admin = token::AdminClient::new(&env, &native_xlm_sac);
    let deposit_amount: i128 = 10_000_0_000_000; // 1,000 XLM
    xlm_admin.mint(&borrower, &deposit_amount);

    env.ledger().set_timestamp(1_000);

    let deal_id = client.create_repo_deal(
        &borrower,
        &deposit_amount,
        &Bytes::new(&env),
        &Vec::new(&env),
    );

    // Fast-forward past the 24h maturity window (86400 seconds)
    env.ledger().set_timestamp(1_000 + 86_401);

    // A keeper triggers liquidation
    client.liquidate_overdue(&deal_id);

    // Borrower's YLDS are now worthless — they cannot call repay_and_close
    let res = client.try_repay_and_close(&deal_id, &borrower);
    assert!(res.is_err());
    assert_eq!(res.err().unwrap().unwrap(), Error::DealLiquidated);

    // Contract retained the XLM collateral
    let xlm_client = token::Client::new(&env, &native_xlm_sac);
    assert!(xlm_client.balance(&client.address) >= deposit_amount);
}

#[test]
fn test_insufficient_ylds_reserves_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AstraRepo);
    let client = AstraRepoClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    let native_xlm_sac = env.register_stellar_asset_contract(admin.clone());
    let ylds_sac = env.register_stellar_asset_contract(admin.clone());

    // Fund contract with XLM but ZERO YLDS
    let xlm_admin = token::AdminClient::new(&env, &native_xlm_sac);
    xlm_admin.mint(&client.address, &1_000_000_000);

    client.initialize(&admin, &native_xlm_sac, &ylds_sac);

    let borrower = Address::generate(&env);
    xlm_admin.mint(&borrower, &10_000_0_000_000);

    let res = client.try_create_repo_deal(
        &borrower,
        &10_000_0_000_000,
        &Bytes::new(&env),
        &Vec::new(&env),
    );

    assert!(res.is_err());
    assert_eq!(
        res.err().unwrap().unwrap(),
        Error::InsufficientYldsReserves
    );
}
