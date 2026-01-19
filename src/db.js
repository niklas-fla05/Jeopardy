const Database = require("better-sqlite3");
const path = require("path");

// Path to your database file
const dbPath = path.join(__dirname, "game.db");

// Create a singleton DB instance
const db = new Database(dbPath);

// Initialize tables if needed
db.prepare(`
  CREATE TABLE IF NOT EXISTS game_state (
    id INTEGER PRIMARY KEY,
    data TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS boards (
    name TEXT PRIMARY KEY,
    boardState TEXT
  )
`).run();

console.log("Database initialized at", dbPath);

module.exports = db;
