const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'leads.db');
const db = new Database(dbPath, { verbose: console.log });

// Create table if not exists
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    category TEXT,
    email TEXT,
    social_profiles TEXT, -- JSON string
    website TEXT,
    score INTEGER DEFAULT 0,
    source TEXT NOT NULL,
    city TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
