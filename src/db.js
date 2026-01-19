const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join("/data/db", "jeopardy.sqlite");
const db = new Database(dbPath);

// Tabellen erstellen, falls sie nicht existieren
db.prepare(`
  CREATE TABLE IF NOT EXISTS game_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS boards (
    name TEXT PRIMARY KEY,
    boardState TEXT
  )
`).run();

module.exports = db;
