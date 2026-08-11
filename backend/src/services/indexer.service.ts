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
              contractIds: ["CDNDVKIT56I7ZQQB7ONPWRNLMEX4BCZ7UKJQZDWLL6L6XHW7IW6UX5US"] 
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
    try {
      const { xdr, scValToNative } = require('@stellar/stellar-sdk');
      const dealId = event.id; // Event ID serves as a unique identifier

      let parsedValue: any = null;
      let eventType = 'Unknown';

      // The topic array contains the event signature (topics)
      if (event.topic && event.topic.length > 0) {
        // Decode the first topic to determine the event type
        try {
          const topicScVal = xdr.ScVal.fromXDR(event.topic[0], 'base64');
          const topicStr = scValToNative(topicScVal);
          eventType = typeof topicStr === 'string' ? topicStr : 'Contract Event';
        } catch (e) {
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
        rawEvent: event,
        eventType,
        data: parsedValue,
        timestamp: event.ledgerClosedAt,
        ledger: event.ledger
      };

      this.dealsCache.set(dealId, processedDeal);
    } catch (e) {
      console.error('Failed to parse event XDR:', e);
    }
  }

  public getAllParsedEvents() {
    const events = [];
    for (const [dealId, deal] of this.dealsCache.entries()) {
      events.push(deal);
    }
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getActiveDealsForBorrower(borrowerAddress: string) {
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
