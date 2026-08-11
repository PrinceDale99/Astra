import sqlite3 from 'sqlite3';
import path from 'path';

export class DbService {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.resolve(__dirname, '../../analytics.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Could not connect to database', err);
      } else {
        console.log('Connected to SQLite database.');
        this.init();
      }
    });
  }

  private init() {
    this.db.serialize(() => {
      // Table for historical daily TVL
      this.db.run(`
        CREATE TABLE IF NOT EXISTS daily_tvl (
          date TEXT PRIMARY KEY,
          tvl_stroops TEXT NOT NULL
        )
      `);

      // Table for unique institutions
      this.db.run(`
        CREATE TABLE IF NOT EXISTS active_institutions (
          address TEXT PRIMARY KEY,
          last_active TEXT NOT NULL
        )
      `);

      // Table for recent deals
      this.db.run(`
        CREATE TABLE IF NOT EXISTS recent_deals (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          time TEXT NOT NULL,
          status TEXT NOT NULL,
          zkProof TEXT NOT NULL,
          health_factor REAL
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS deal_history (
          id TEXT PRIMARY KEY,
          deal_id INTEGER,
          borrower TEXT NOT NULL,
          type TEXT NOT NULL,
          deposited_xlm REAL NOT NULL,
          issued_ylds REAL,
          closed_at TEXT NOT NULL,
          ledger INTEGER NOT NULL
        )
      `);
    });
  }

  public recordTvl(tvlStroops: string) {
    const today = new Date().toISOString().split('T')[0];
    this.db.run(
      `INSERT INTO daily_tvl (date, tvl_stroops) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET tvl_stroops=excluded.tvl_stroops`,
      [today, tvlStroops]
    );
  }

  public recordInstitution(address: string) {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO active_institutions (address, last_active) VALUES (?, ?)
       ON CONFLICT(address) DO UPDATE SET last_active=excluded.last_active`,
      [address, now]
    );
  }

  public getHistoricalTvl(): Promise<{ day: string, tvl: number }[]> {
    return new Promise((resolve, reject) => {
      // Get last 7 days including today
      this.db.all(
        `SELECT date, tvl_stroops FROM daily_tvl ORDER BY date DESC LIMIT 7`,
        (err, rows: any[]) => {
          if (err) return reject(err);
          // Format for recharts: reverse to chronological, scale stroops to USD
          const formatted = rows.reverse().map(row => {
            const dateObj = new Date(row.date);
            const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            return {
              day: dayStr,
              tvl: Number(row.tvl_stroops) / 10000000 // Convert stroops to decimal
            };
          });
          resolve(formatted);
        }
      );
    });
  }

  public recordDeal(deal: any) {
    this.db.run(
      `INSERT INTO recent_deals (id, type, amount, time, status, zkProof, health_factor) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      [deal.id, deal.type, deal.amount, deal.time, deal.status, deal.zkProof, deal.health_factor]
    );
  }

  public getRecentDeals(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM recent_deals ORDER BY time DESC LIMIT 50`, (err, rows: any[]) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  public getActiveInstitutionsCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(*) as count FROM active_institutions`, (err, row: any) => {
        if (err) return reject(err);
        resolve(row.count);
      });
    });
  }

  public recordClosedDeal(deal: {
    id: string;
    deal_id: number | null;
    borrower: string;
    type: string;
    deposited_xlm: number;
    issued_ylds: number | null;
    closed_at: string;
    ledger: number;
  }) {
    this.db.run(
      `INSERT INTO deal_history (id, deal_id, borrower, type, deposited_xlm, issued_ylds, closed_at, ledger)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      [deal.id, deal.deal_id, deal.borrower, deal.type, deal.deposited_xlm, deal.issued_ylds, deal.closed_at, deal.ledger]
    );
  }

  public getClosedDeals(
    page: number,
    limit: number,
    borrower?: string
  ): Promise<{ deals: any[]; total: number }> {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      const whereClause = borrower ? `WHERE borrower = ?` : ``;
      const params = borrower ? [borrower, limit, offset] : [limit, offset];
      const countParams = borrower ? [borrower] : [];

      this.db.get(
        `SELECT COUNT(*) as count FROM deal_history ${whereClause}`,
        countParams,
        (err, countRow: any) => {
          if (err) return reject(err);
          this.db.all(
            `SELECT * FROM deal_history ${whereClause} ORDER BY closed_at DESC LIMIT ? OFFSET ?`,
            params,
            (err2, rows: any[]) => {
              if (err2) return reject(err2);
              resolve({ deals: rows, total: countRow.count });
            }
          );
        }
      );
    });
  }
}

export const dbService = new DbService();
