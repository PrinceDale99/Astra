"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbService = exports.DbService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
class DbService {
    db;
    constructor() {
        const dbPath = path_1.default.resolve(__dirname, '../../analytics.db');
        this.db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                console.error('Could not connect to database', err);
            }
            else {
                console.log('Connected to SQLite database.');
                this.init();
            }
        });
    }
    init() {
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
        });
    }
    recordTvl(tvlStroops) {
        const today = new Date().toISOString().split('T')[0];
        this.db.run(`INSERT INTO daily_tvl (date, tvl_stroops) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET tvl_stroops=excluded.tvl_stroops`, [today, tvlStroops]);
    }
    recordInstitution(address) {
        const now = new Date().toISOString();
        this.db.run(`INSERT INTO active_institutions (address, last_active) VALUES (?, ?)
       ON CONFLICT(address) DO UPDATE SET last_active=excluded.last_active`, [address, now]);
    }
    getHistoricalTvl() {
        return new Promise((resolve, reject) => {
            // Get last 7 days including today
            this.db.all(`SELECT date, tvl_stroops FROM daily_tvl ORDER BY date DESC LIMIT 7`, (err, rows) => {
                if (err)
                    return reject(err);
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
            });
        });
    }
    recordDeal(deal) {
        this.db.run(`INSERT INTO recent_deals (id, type, amount, time, status, zkProof, health_factor) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`, [deal.id, deal.type, deal.amount, deal.time, deal.status, deal.zkProof, deal.health_factor]);
    }
    getRecentDeals() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM recent_deals ORDER BY time DESC LIMIT 50`, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }
    getActiveInstitutionsCount() {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT COUNT(*) as count FROM active_institutions`, (err, row) => {
                if (err)
                    return reject(err);
                resolve(row.count);
            });
        });
    }
}
exports.DbService = DbService;
exports.dbService = new DbService();
