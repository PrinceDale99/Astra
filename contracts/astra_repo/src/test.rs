#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, Address, Bytes, Env, Vec,
};

fn setup_test() -> (Env, AstraRepoClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Use updated API (v27 prefers register / register_stellar_asset_contract_v2,
    // but deprecated aliases still compile — use v2 for SACs to avoid warnings)
    let contract_id = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address(); // dummy — we actually want AstraRepo
    // Re-register AstraRepo properly
    let contract_id = env.register_contract(None, AstraRepo);
    let client = AstraRepoClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    let native_xlm_sac = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let xlm_stellar = token::StellarAssetClient::new(&env, &native_xlm_sac);
    xlm_stellar.mint(&client.address, &100_000_000_000_i128);

    let ylds_sac = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let ylds_stellar = token::StellarAssetClient::new(&env, &ylds_sac);
    ylds_stellar.mint(&client.address, &3_000_000_0_000_000_i128);

    client.initialize(&admin, &native_xlm_sac, &ylds_sac);

    (env, client, admin, native_xlm_sac, ylds_sac)
}

#[test]
fn test_create_deal_and_repay() {
    let (env, client, _admin, native_xlm_sac, ylds_sac) = setup_test();
    let borrower = Address::generate(&env);

    let xlm_stellar = token::StellarAssetClient::new(&env, &native_xlm_sac);
    let xlm_client = token::Client::new(&env, &native_xlm_sac);
    let ylds_client = token::Client::new(&env, &ylds_sac);

    let deposit: i128 = 50_000_0_000_000; // 5,000 XLM in stroops
    xlm_stellar.mint(&borrower, &deposit);

    env.ledger().set_timestamp(1_000);

    let deal_id = client.create_repo_deal(
        &borrower,
        &deposit,
        &Bytes::new(&env),
        &Vec::new(&env),
    );
    assert_eq!(deal_id, 1);

    // After deposit: 0 XLM, deposit_amount YLDS
    assert_eq!(xlm_client.balance(&borrower), 0);
    assert_eq!(ylds_client.balance(&borrower), deposit);

    // Repay before maturity
    env.ledger().set_timestamp(1_500);
    client.repay_and_close(&deal_id, &borrower);

    let interest = deposit / 100;
    assert_eq!(xlm_client.balance(&borrower), deposit - interest);
    assert_eq!(ylds_client.balance(&borrower), 0);
}

#[test]
fn test_liquidation_of_overdue_deal() {
    let (env, client, _admin, native_xlm_sac, _ylds_sac) = setup_test();
    let borrower = Address::generate(&env);

    let xlm_stellar = token::StellarAssetClient::new(&env, &native_xlm_sac);
    let xlm_client = token::Client::new(&env, &native_xlm_sac);
    let deposit: i128 = 10_000_0_000_000;
    xlm_stellar.mint(&borrower, &deposit);

    env.ledger().set_timestamp(1_000);
    let deal_id = client.create_repo_deal(
        &borrower,
        &deposit,
        &Bytes::new(&env),
        &Vec::new(&env),
    );

    env.ledger().set_timestamp(1_000 + 86_401);
    client.liquidate_overdue(&deal_id);

    let res = client.try_repay_and_close(&deal_id, &borrower);
    assert!(res.is_err());
    assert_eq!(res.err().unwrap().unwrap(), Error::DealLiquidated);

    assert!(xlm_client.balance(&client.address) >= deposit);
}

#[test]
fn test_insufficient_ylds_reserves() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AstraRepo);
    let client = AstraRepoClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    let native_xlm_sac = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let ylds_sac = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    // Fund contract with XLM but ZERO YLDS
    let xlm_stellar = token::StellarAssetClient::new(&env, &native_xlm_sac);
    xlm_stellar.mint(&client.address, &1_000_000_000_i128);

    client.initialize(&admin, &native_xlm_sac, &ylds_sac);

    let borrower = Address::generate(&env);
    xlm_stellar.mint(&borrower, &10_000_0_000_000_i128);

    let res = client.try_create_repo_deal(
        &borrower,
        &10_000_0_000_000_i128,
        &Bytes::new(&env),
        &Vec::new(&env),
    );
    assert!(res.is_err());
    assert_eq!(res.err().unwrap().unwrap(), Error::InsufficientYldsReserves);
}

#[test]
fn test_get_margin_ratio() {
    let (env, client, _admin, native_xlm_sac, ylds_sac) = setup_test();
    let borrower = Address::generate(&env);

    let xlm_stellar = token::StellarAssetClient::new(&env, &native_xlm_sac);
    let deposit: i128 = 10_000_0_000_000;
    xlm_stellar.mint(&borrower, &deposit);

    env.ledger().set_timestamp(1_000);
    let deal_id = client.create_repo_deal(
        &borrower,
        &deposit,
        &Bytes::new(&env),
        &Vec::new(&env),
    );

    // Initial reserve is 2,990,000 YLDS, issued is 10,000 YLDS.
    // (2,990,000 * 100) / 10,000 = 29900%
    let ratio = client.get_margin_ratio(&deal_id);
    assert_eq!(ratio, 29900);
}

#[test]
fn test_fix_sacs() {
    let (env, client, _admin, _native_xlm_sac, _ylds_sac) = setup_test();
    
    let new_xlm = Address::generate(&env);
    let new_ylds = Address::generate(&env);
    
    // Call fix_sacs
    client.fix_sacs(&new_xlm, &new_ylds);
    
    let borrower = Address::generate(&env);
    // Since the new SAC address isn't registered, trying to create a deal should fail
    let res = client.try_create_repo_deal(
        &borrower,
        &10_000_000_i128,
        &Bytes::new(&env),
        &Vec::new(&env),
    );
    assert!(res.is_err());
}


