"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexerService = void 0;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const lru_cache_1 = require("lru-cache");
const db_service_1 = require("./db.service");
class IndexerService {
    server;
    dealsCache;
    connected = false;
    currentTvlStroops = BigInt(0);
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
            // Go back ~13 hours (approx 10,000 ledgers at 5s/ledger) to catch recent testnet activity
            this.lastLedger = Math.max(0, latest.sequence - 10000);
            console.log(`Starting indexer from ledger ${this.lastLedger}`);
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
                            contractIds: ["CC4YMET3P4EOL5YOCPSXWTBM4F6DZEVJLCMKTFGDZXCHOSYW5MRHK7T2"]
                        }
                    ]
                });
                if (response.events && response.events.length > 0) {
                    let updatedTvl = false;
                    response.events.forEach(event => {
                        const parsed = this.processEvent(event);
                        if (parsed && parsed.data?.collateral_amount) {
                            this.currentTvlStroops += BigInt(parsed.data.collateral_amount.toString());
                            updatedTvl = true;
                        }
                        if (parsed && parsed.data?.borrower) {
                            db_service_1.dbService.recordInstitution(parsed.data.borrower);
                        }
                    });
                    if (updatedTvl) {
                        db_service_1.dbService.recordTvl(this.currentTvlStroops.toString());
                    }
                    this.lastLedger = response.latestLedger;
                }
            }
            catch (err) {
                console.error('Error polling events:', err);
            }
        }, 10000); // 10 seconds poll interval
    }
    processEvent(event) {
        try {
            const { xdr, scValToNative } = require('@stellar/stellar-sdk');
            const dealId = event.id; // Event ID serves as a unique identifier
            let parsedValue = null;
            let eventType = 'Unknown';
            // The topic array contains the event signature (topics)
            if (event.topic && event.topic.length > 0) {
                // Decode the first topic to determine the event type
                try {
                    const topicScVal = xdr.ScVal.fromXDR(event.topic[0], 'base64');
                    const topicStr = scValToNative(topicScVal);
                    eventType = typeof topicStr === 'string' ? topicStr : 'Contract Event';
                }
                catch (e) {
                    // ignore topic parse error
                }
            }
            // Decode the actual event payload value
            if (event.value && event.value.xdr) {
                const scVal = xdr.ScVal.fromXDR(event.value.xdr, 'base64');
                parsedValue = scValToNative(scVal);
            }
            const processedDeal = {
                id: dealId,
                type: eventType,
                amount: parsedValue?.collateral_amount ? Number(parsedValue.collateral_amount) / 10000000 : 0,
                time: new Date(event.timestamp).toISOString(),
                status: 'Verified',
                zkProof: parsedValue?.zkp_hash ? 'Verified On-Chain' : 'N/A',
                health_factor: parsedValue?.min_health_factor ? Number(parsedValue.min_health_factor) / 100 : null,
                data: parsedValue,
                timestamp: event.ledgerClosedAt,
                ledger: event.ledger
            };
            this.dealsCache.set(dealId, processedDeal);
            const { dbService } = require('./db.service');
            dbService.recordDeal(processedDeal);
            return processedDeal;
        }
        catch (e) {
            console.error('Failed to parse event XDR:', e);
            return null;
        }
    }
    getAllParsedEvents() {
        const events = [];
        for (const [dealId, deal] of this.dealsCache.entries()) {
            events.push(deal);
        }
        return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    getActiveDealsForBorrower(borrowerAddress) {
        const activeDeals = [];
        for (const [dealId, deal] of this.dealsCache.entries()) {
            // Assuming parsedValue might contain borrower
            if (deal.data && deal.data.borrower === borrowerAddress) {
                activeDeals.push(deal);
            }
        }
        return activeDeals;
    }
}
exports.IndexerService = IndexerService;
