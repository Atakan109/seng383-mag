const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_FILE = path.join(__dirname, '..', 'data', 'app.db');

// Opens the SQLite database and creates the tables if they do not exist yet.
// Pass ':memory:' to get a temporary database (used in tests).
function openDatabase(filename = process.env.DB_FILE || DEFAULT_DB_FILE) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      development_area TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `);
  return db;
}

module.exports = { openDatabase };
