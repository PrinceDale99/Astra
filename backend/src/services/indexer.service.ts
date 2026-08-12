/** @feature ParallelIndexer - processes Soroban event batches concurrently via Promise.all, broadcasts NEW_DEAL events to WebSocket clients, records repaid/liquidated events to deal_history */
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
    this.dealsCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 60 * 24 * 7,
    });
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
      const seq = latest.sequence;
      // oldestLedger is the archive boundary - we CANNOT go before this or we get silent 0 results
      const oldest = (latest as any).oldestLedger ?? Math.max(1, seq - 100000);
      // Start from 6 hours ago (~4320 ledgers) but never before the archive window
      const sixHoursAgo = seq - 4320;
      this.lastLedger = Math.max(oldest + 1, sixHoursAgo);
      console.log(`Starting indexer from ledger ${this.lastLedger} (latest=${seq}, oldest=${oldest})`);
    } catch (e) {
      console.warn('Could not fetch latest ledger, defaulting to 0.', e);
      this.lastLedger = 0;
    }

    setInterval(async () => {
      try {
        if (this.lastLedger === 0) {
          const latest = await this.server.getLatestLedger();
          const oldest = (latest as any).oldestLedger ?? Math.max(1, latest.sequence - 100000);
          this.lastLedger = Math.max(oldest + 1, latest.sequence - 4320);
          console.log(`Indexer initialized at ledger ${this.lastLedger}`);
          return;
        }

        const response = await this.server.getEvents({
          startLedger: this.lastLedger,
          filters: [
            {
              type: 'contract',
              contractIds: ['CB5VLN6TSOLKVLJ2XENVGMAHRVZLAAOGVBFFAJRHOZ7X5XD4WAWLL2F7'],
            },
          ],
        });

        // ? FIX 1: ALWAYS advance lastLedger — regardless of whether events exist.
        // This prevents the indexer from re-scanning the same ledger range forever.
        if (response.latestLedger && response.latestLedger > this.lastLedger) {
          this.lastLedger = response.latestLedger;
        }

        if (response.events && response.events.length > 0) {
          console.log(`[Indexer] Processing ${response.events.length} new events from ledger ${this.lastLedger}`);
          let updatedTvl = false;

          await Promise.all(response.events.map(async (event: any) => {
            const parsed = this.processEvent(event);
            if (parsed) {
              // ? FIX 2: Accumulate TVL from deal_created events using the correct tuple index
              if (parsed.xlm_deposit > 0) {
                this.currentTvlStroops += BigInt(Math.round(parsed.xlm_deposit * 1e7));
                updatedTvl = true;
              }
              // Record institution for any event that has a borrower
              if (parsed.borrower) {
                dbService.recordInstitution(parsed.borrower);
              }
            }
          }));

          if (updatedTvl) {
            dbService.recordTvl(this.currentTvlStroops.toString());
          }
        }
      } catch (err) {
        console.error('Error polling events:', err);
      }
    }, 10000); // 10 seconds poll interval
  }

  private processEvent(event: any) {
    try {
      const { xdr, scValToNative } = require('@stellar/stellar-sdk');
      const dealId = event.id;

      let parsedTopic: any[] = [];
      let eventType = 'Unknown';
      let dealIdOnChain: number | null = null;

      // ? FIX 3: Correctly parse topic array — [eventName, dealId]
      if (event.topic && event.topic.length > 0) {
        parsedTopic = event.topic.map((t: string) => {
          try {
            return scValToNative(xdr.ScVal.fromXDR(t, 'base64'));
          } catch {
            return null;
          }
        });
        if (typeof parsedTopic[0] === 'string') eventType = parsedTopic[0];
        if (parsedTopic[1] !== undefined && parsedTopic[1] !== null) {
          dealIdOnChain = Number(parsedTopic[1]);
        }
      }

      // ? FIX 4: Parse value — our contract emits tuples, not objects
      let parsedValue: any = null;
      if (event.value && event.value.xdr) {
        try {
          parsedValue = scValToNative(xdr.ScVal.fromXDR(event.value.xdr, 'base64'));
        } catch { /* ignore */ }
      }

      // ? FIX 5: Use ledgerClosedAt (correct SDK field) not timestamp
      const closedAt = event.ledgerClosedAt || event.timestamp || new Date().toISOString();

      // Map event types to human-readable labels
      const typeLabels: Record<string, string> = {
        deal_created: 'Repo Deal',
        repaid: 'Repay',
        liquidated: 'Liquidation',
      };

      // Extract fields from tuple value based on event type:
      // deal_created value: (borrower, xlm_amount, ylds_amount)
      // repaid value:       (borrower, xlm_amount, ylds_amount)
      // liquidated value:   (borrower, xlm_amount)
      let borrower = 'unknown';
      let xlmDeposit = 0;
      let issuedYlds: number | null = null;
      let zkProofStr = 'N/A';

      if (Array.isArray(parsedValue) && parsedValue.length >= 2) {
        borrower = String(parsedValue[0] ?? 'unknown');
        xlmDeposit = parsedValue[1] !== undefined ? Number(parsedValue[1]) / 1e7 : 0;
        issuedYlds = parsedValue[2] !== undefined ? Number(parsedValue[2]) / 1e7 : null;
      } else if (parsedValue && typeof parsedValue === 'object') {
        // Fallback: object-style value
        borrower = parsedValue.borrower || 'unknown';
        xlmDeposit = parsedValue.collateral_amount ? Number(parsedValue.collateral_amount) / 1e7 : 0;
        issuedYlds = parsedValue.issued_ylds ? Number(parsedValue.issued_ylds) / 1e7 : null;
        zkProofStr = parsedValue.zkp_hash ? 'Verified On-Chain' : 'N/A';
      }

      const displayType = typeLabels[eventType] || eventType;

      const processedDeal = {
        id: dealId,
        type: displayType,
        rawType: eventType,
        amount: xlmDeposit,
        xlm_deposit: xlmDeposit,
        issued_ylds: issuedYlds,
        borrower,
        deal_id: dealIdOnChain,
        time: closedAt,
        status: 'Verified',
        zkProof: zkProofStr,
        health_factor: null,
        timestamp: closedAt,
        ledger: event.ledger || 0,
      };

      // ? FIX 6: Record deal_created AND closed events to deal_history for the history page
      if (eventType === 'deal_created') {
        dbService.recordClosedDeal({
          id: dealId,
          deal_id: dealIdOnChain,
          borrower,
          type: 'created',
          deposited_xlm: xlmDeposit,
          issued_ylds: issuedYlds,
          closed_at: closedAt,
          ledger: event.ledger || 0,
        });
      } else if (eventType === 'repaid' || eventType === 'liquidated') {
        dbService.recordClosedDeal({
          id: dealId,
          deal_id: dealIdOnChain,
          borrower,
          type: eventType,
          deposited_xlm: xlmDeposit,
          issued_ylds: issuedYlds,
          closed_at: closedAt,
          ledger: event.ledger || 0,
        });
      }

      this.dealsCache.set(dealId, processedDeal);

      if (this.broadcastFn) {
        this.broadcastFn({ type: 'NEW_DEAL', payload: processedDeal });
      }

      dbService.recordDeal(processedDeal);

      console.log(`[Indexer] Event: ${eventType} | Deal #${dealIdOnChain} | Borrower: ${borrower.substring(0, 8)}... | ${xlmDeposit.toFixed(2)} XLM`);
      return processedDeal;
    } catch (e) {
      console.error('Failed to parse event XDR:', e);
      return null;
    }
  }

  public getAllParsedEvents() {
    const events = [];
    for (const [, deal] of this.dealsCache.entries()) {
      events.push(deal);
    }
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getActiveDealsForBorrower(borrowerAddress: string) {
    const activeDeals = [];
    for (const [, deal] of this.dealsCache.entries()) {
      if (deal.borrower === borrowerAddress) {
        activeDeals.push(deal);
      }
    }
    return activeDeals;
  }
}
