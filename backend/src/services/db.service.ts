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

  public getActiveInstitutionsCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(*) as count FROM active_institutions`, (err, row: any) => {
        if (err) return reject(err);
        resolve(row.count);
      });
    });
  }
}

export const dbService = new DbService();
