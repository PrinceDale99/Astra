"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexerService = void 0;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const lru_cache_1 = require("lru-cache");
class IndexerService {
    server;
    dealsCache;
    connected = false;
    constructor() {
        // Free tier optimized memory limits
        this.dealsCache = new lru_cache_1.LRUCache({
            max: 500, // max 500 active deals in memory
            ttl: 1000 * 60 * 60 * 24 * 7, // 7 days TTL (simulated persistence)
        });
        // Public Soroban testnet RPC
        this.server = new stellar_sdk_1.rpc.Server('https://soroban-testnet.stellar.org');
    }
    isConnected() {
        return this.connected;
    }
    lastLedger = 0;
    async startPolling() {
        console.log('Starting Soroban Event Indexer...');
        this.connected = true;
        try {
            const latest = await this.server.getLatestLedger();
            this.lastLedger = latest.sequence;
        }
        catch (e) {
            console.warn('Could not fetch latest ledger, defaulting to recent.', e);
            this.lastLedger = 0;
        }
        setInterval(async () => {
            try {
                if (this.lastLedger === 0) {
                    const latest = await this.server.getLatestLedger();
                    this.lastLedger = latest.sequence;
                    return;
                }
                const response = await this.server.getEvents({
                    startLedger: this.lastLedger,
                    filters: [
                        {
                            type: "contract",
                            contractIds: ["CCFCMYKC3U5UEVQBJ22LOV525ZYIZM62RMILKRJBDDPL4TOPMXZEEPMM"]
                        }
                    ]
                });
                if (response.events && response.events.length > 0) {
                    response.events.forEach(event => this.processEvent(event));
                    this.lastLedger = response.latestLedger;
                }
            }
            catch (err) {
                console.error('Error polling events:', err);
            }
        }, 10000); // 10 seconds poll interval
    }
    processEvent(event) {
        // Basic event decoding - in a full production system, we decode the XDR
        // Here we just store the raw event for the UI to consume if it matches
        const dealId = event.id; // Event ID can serve as a unique deal ID for now
        this.dealsCache.set(dealId, event);
    }
    getActiveDealsForBorrower(borrowerAddress) {
        const activeDeals = [];
        for (const [dealId, deal] of this.dealsCache.entries()) {
            if (deal.borrower === borrowerAddress) {
                activeDeals.push(deal);
            }
        }
        return activeDeals;
    }
}
exports.IndexerService = IndexerService;
