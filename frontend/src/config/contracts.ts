/**
 * contracts.ts — Single source of truth for all on-chain contract addresses.
 * Update YLDS_SAC_CONTRACT_ID after running backend/setup_ylds.js.
 */

export const CONTRACTS = {
  /** The deployed AstraRepo Soroban contract */
  ASTRA_REPO: 'CCFCMYKC3U5UEVQBJ22LOV525ZYIZM62RMILKRJBDDPL4TOPMXZEEPMM',

  /** Native XLM Stellar Asset Contract (SAC) on Testnet */
  NATIVE_XLM_SAC: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',

  /**
   * YLDS Stellar Asset Contract (SAC) — the receipt token.
   * Deployed via backend/setup_ylds_v2.js on 2026-08-06.
   * Issuer: GDWVUZ6W6WTJUTCM23LXZYU63D7D5PKHXZIQ3BMTNYN5KLFDH7NIJOZC
   * Contract holds 3,000,000 YLDS funded by setup_ylds_v2.js.
   */
  YLDS_SAC: 'CBT2FAHTV57M4LFZREZNOU7XYQQZWKX3GKCF3RGVX7DJVYNFOVJ3TFVT',
} as const;

/** YLDS classic asset details used for Freighter trustline setup */
export const YLDS_ASSET = {
  code: 'YLDS',
  /** Issuer public key — generated via setup_ylds.js on 2026-08-06 */
  issuer: 'GDWVUZ6W6WTJUTCM23LXZYU63D7D5PKHXZIQ3BMTNYN5KLFDH7NIJOZC',
};

