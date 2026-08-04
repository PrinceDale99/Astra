import { rpc } from '@stellar/stellar-sdk';
import { LRUCache } from 'lru-cache';

export class IndexerService {
  private server: rpc.Server;
  private dealsCache: LRUCache<string, any>;
  private connected: boolean = false;

  constructor() {
    // Free tier optimized memory limits
    this.dealsCache = new LRUCache({
      max: 500, // max 500 active deals in memory
      ttl: 1000 * 60 * 60 * 24 * 7, // 7 days TTL (simulated persistence)
    });
    // Public Soroban testnet RPC
    this.server = new rpc.Server('https://soroban-testnet.stellar.org');
  }

  public isConnected() {
    return this.connected;
  }

  private lastLedger: number = 0;

  public async startPolling() {
    console.log('Starting Soroban Event Indexer...');
    this.connected = true;

    try {
      const latest = await this.server.getLatestLedger();
      this.lastLedger = latest.sequence;
    } catch (e) {
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
      } catch (err) {
        console.error('Error polling events:', err);
      }
    }, 10000); // 10 seconds poll interval
  }

  private processEvent(event: any) {
    // Basic event decoding - in a full production system, we decode the XDR
    // Here we just store the raw event for the UI to consume if it matches
    const dealId = event.id; // Event ID can serve as a unique deal ID for now
    this.dealsCache.set(dealId, event);
  }

  public getActiveDealsForBorrower(borrowerAddress: string) {
    const activeDeals = [];
    for (const [dealId, deal] of this.dealsCache.entries()) {
      if (deal.borrower === borrowerAddress) {
        activeDeals.push(deal);
      }
    }
    return activeDeals;
  }
}
