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
  // SQLite does not check foreign keys unless this is turned on.
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('parent', 'specialist', 'child'))
    );

    -- A child belongs to one parent and can have its own login (user_id).
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL REFERENCES users(id),
      user_id INTEGER UNIQUE REFERENCES users(id),
      name TEXT NOT NULL
    );

    -- Which specialists can see which child. Unlinking deletes the row.
    CREATE TABLE IF NOT EXISTS specialist_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id),
      specialist_id INTEGER NOT NULL REFERENCES users(id),
      specialist_type TEXT NOT NULL,
      linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (child_id, specialist_id)
    );

    -- child_id and assigned_by are filled by the task API. They allow NULL so that
    -- databases created before these columns existed can be upgraded below.
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      development_area TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      child_id INTEGER REFERENCES children(id),
      assigned_by INTEGER REFERENCES users(id)
    )
  `);
  addMissingTaskColumns(db);
  return db;
}

// Older local databases have a tasks table without child_id and assigned_by.
// CREATE TABLE IF NOT EXISTS does not change an existing table, so add them here.
function addMissingTaskColumns(db) {
  const columns = db.prepare('PRAGMA table_info(tasks)').all().map((column) => column.name);
  if (!columns.includes('child_id')) {
    db.exec('ALTER TABLE tasks ADD COLUMN child_id INTEGER REFERENCES children(id)');
  }
  if (!columns.includes('assigned_by')) {
    db.exec('ALTER TABLE tasks ADD COLUMN assigned_by INTEGER REFERENCES users(id)');
  }
}

module.exports = { openDatabase };
