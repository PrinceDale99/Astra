import { rpc } from '@stellar/stellar-sdk';
import { LRUCache } from 'lru-cache';
import { dbService } from './db.service';

export class IndexerService {
  private server: rpc.Server;
  private dealsCache: LRUCache<string, any>;
  private connected: boolean = false;
  private currentTvlStroops: bigint = BigInt(0);
  private broadcastFn: ((event: any) => void) | null = null;

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

  public setBroadcast(fn: (event: any) => void) {
    this.broadcastFn = fn;
  }

  private lastLedger: number = 0;

  public async startPolling() {
    console.log('Starting Soroban Event Indexer...');
    this.connected = true;

    try {
      const latest = await this.server.getLatestLedger();
      // Go back ~13 hours (approx 10,000 ledgers at 5s/ledger) to catch recent testnet activity
      this.lastLedger = Math.max(0, latest.sequence - 10000);
      console.log(`Starting indexer from ledger ${this.lastLedger}`);
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
          let updatedTvl = false;
          const { dbService } = require('./db.service');
          await Promise.all(response.events.map(async (event: any) => {
            const parsed = this.processEvent(event);
            if (parsed && parsed.data?.collateral_amount) {
              this.currentTvlStroops += BigInt(parsed.data.collateral_amount.toString());
              updatedTvl = true;
            }
            if (parsed && parsed.data?.borrower) {
              dbService.recordInstitution(parsed.data.borrower);
            }
          }));
          
          if (updatedTvl) {
            dbService.recordTvl(this.currentTvlStroops.toString());
          }

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

      // Index closed deal events into deal_history table
      if (eventType === 'repaid' || eventType === 'liquidated') {
        const { dbService } = require('./db.service');
        const closedDeal = {
          id: dealId,
          deal_id: parsedValue && parsedValue[1] ? Number(parsedValue[1]) : null,
          borrower: parsedValue && parsedValue[0] ? String(parsedValue[0]) : 'unknown',
          type: eventType,
          deposited_xlm: parsedValue && parsedValue[1] ? Number(parsedValue[1]) / 1e7 : 0,
          issued_ylds: eventType === 'repaid' && parsedValue && parsedValue[2] ? Number(parsedValue[2]) / 1e7 : null,
          closed_at: new Date(event.timestamp || Date.now()).toISOString(),
          ledger: event.ledger || 0
        };
        dbService.recordClosedDeal(closedDeal);
      }

      this.dealsCache.set(dealId, processedDeal);
      if (this.broadcastFn) {
        this.broadcastFn({ type: 'NEW_DEAL', payload: processedDeal });
      }
      const { dbService } = require('./db.service');
      dbService.recordDeal(processedDeal);
      return processedDeal;
    } catch (e) {
      console.error('Failed to parse event XDR:', e);
      return null;
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
