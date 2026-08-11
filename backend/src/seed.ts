import sqlite3 from 'sqlite3';
import path from 'path';

// Seed the SQLite database with 7 days of realistic TVL growth
const dbPath = path.resolve(__dirname, '../analytics.db');
const db = new sqlite3.Database(dbPath);

console.log('Seeding database at:', dbPath);

db.serialize(() => {
  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_tvl (
      date TEXT PRIMARY KEY,
      tvl_stroops TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS active_institutions (
      address TEXT PRIMARY KEY,
      last_active TEXT NOT NULL
    )
  `);

  db.run(`
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

  db.run(`
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

  // Seed TVL for the last 7 days (growing realistically)
  const today = new Date();
  let baseTvl = 26400000; // 26.4M in USD equivalents

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Convert to stroops (multiply by 10,000,000)
    const tvlStroops = BigInt(Math.floor(baseTvl * 10000000)).toString();
    
    db.run(
      `INSERT INTO daily_tvl (date, tvl_stroops) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET tvl_stroops=excluded.tvl_stroops`,
      [dateStr, tvlStroops]
    );

    console.log(`Seeded TVL for ${dateStr}: ${tvlStroops} stroops`);

    // Grow TVL for next day
    baseTvl += Math.random() * 5000000; // Add 0 to 5M per day
  }

  // Seed some active institutions
  const mockAddresses = [
    'GB3X...M2A',
    'GCTQ...9XL',
    'GDDY...3PQ',
    'GBZ4...8KJ',
    'GC21...7YT',
    'GAB5...4XN',
    'GD9K...2WQ',
    'GB88...1PO',
    'GC7L...6RT',
    'GDF2...5ER',
    'GB1N...0UI',
    'GC6M...9SD',
    'GD4B...8FG',
    'GB5V...7HJ'
  ];

  mockAddresses.forEach(addr => {
    db.run(
      `INSERT INTO active_institutions (address, last_active) VALUES (?, ?)
       ON CONFLICT(address) DO UPDATE SET last_active=excluded.last_active`,
      [addr, new Date().toISOString()]
    );
  });
  console.log(`Seeded 14 active institutions.`);

  // Seed recent deals
  for (let i = 0; i < 8; i++) {
    const isCreate = i % 3 !== 0;
    const dealId = `tx-${Math.random().toString(36).substr(2, 9)}`;
    const timeStr = new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString();
    
    db.run(
      `INSERT INTO recent_deals (id, type, amount, time, status, zkProof, health_factor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dealId,
        isCreate ? 'create_repo_deal' : 'repay_and_close',
        (Math.floor(Math.random() * 500000) + 10000) / 10000,
        timeStr,
        'Verified',
        'Verified On-Chain',
        isCreate ? (Math.random() * 0.6 + 1.1) : null
      ]
    );
  }
  console.log(`Seeded 8 recent deals.`);

  // Seed closed deal history
  const closedTypes = ['repaid', 'repaid', 'liquidated', 'repaid', 'liquidated'];
  for (let i = 0; i < 5; i++) {
    const closedId = `hist-${Math.random().toString(36).substr(2, 9)}`;
    const closedAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 3600000)).toISOString();
    db.run(
      `INSERT OR IGNORE INTO deal_history (id, deal_id, borrower, type, deposited_xlm, issued_ylds, closed_at, ledger)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        closedId,
        i + 1,
        `G${Math.random().toString(36).substr(2, 54).toUpperCase()}`,
        closedTypes[i],
        (Math.floor(Math.random() * 50000) + 5000) / 10000,
        closedTypes[i] === 'repaid' ? (Math.floor(Math.random() * 50000) + 5000) / 10000 : null,
        closedAt,
        4000000 + i * 10000
      ]
    );
  }
  console.log('Seeded 5 closed deals in deal_history.');

  console.log('Seeding complete! You can now restart the backend to see data.');
});
