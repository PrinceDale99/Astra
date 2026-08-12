const { rpc } = require('@stellar/stellar-sdk');

async function test() {
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  const latest = await server.getLatestLedger();
  const startLedger = Math.max(0, latest.sequence - 10000);
  
  try {
    const response = await server.getEvents({
      startLedger: 0,
      filters: [{ type: "contract", contractIds: ["CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2"] }]
    });
    console.log("Success! Events fetched:", response.events ? response.events.length : 0);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
