const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data.db");

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    // gespeicherter Game-State
    db.run(`
        CREATE TABLE IF NOT EXISTS game_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT
        )
    `);

    // registrierte Boards
    db.run(`
        CREATE TABLE IF NOT EXISTS boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            data TEXT
        )
    `);
});

module.exports = db;