const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* ===========================
   DATABASE SETUP (SQLite)
=========================== */
const dbPath = path.join(__dirname, "game.db");
const db = new Database(dbPath);

// Tabellen erstellen, falls sie nicht existieren
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

/* ===========================
   DEFAULTS
=========================== */
const defaultPlayers = [
  { id: 1, name: "Player 1", score: 0 },
  { id: 2, name: "Player 2", score: 0 },
  { id: 3, name: "Player 3", score: 0 },
  { id: 4, name: "Player 4", score: 0 }
];

let gameData = {
  players: [...defaultPlayers],
  boardState: [],
  currentQuestion: { isOpen: false }
};

/* ===========================
   HELPERS
=========================== */
function createBoardFromJSON(json) {
  const board = [];
  json.categories.forEach(cat => {
    const col = [];
    cat.questions.forEach(q => {
      col.push({
        category: cat.name,
        points: q.points,
        question: q.question,
        answer: q.answer,
        status: "available"
      });
    });
    board.push(col);
  });
  return board;
}

function createDummyBoard() {
  const categories = ["A", "B", "C", "D", "E"];
  const board = [];

  for (const cat of categories) {
    const col = [];
    for (let points = 100; points <= 500; points += 100) {
      col.push({
        category: cat,
        points: points,
        question: "Dummy Frage",
        answer: "Dummy Antwort",
        status: "available"
      });
    }
    board.push(col);
  }

  return board;
}

async function loadGameState() {
  const row = db.prepare("SELECT data FROM game_state WHERE id = 1").get();

  if (row?.data) {
    gameData = JSON.parse(row.data);
    console.log("Server: Game-State aus SQLite geladen");
  } else {
    gameData.boardState = createDummyBoard();
    await saveGameState();
    console.log("Server: Neuer Game-State erstellt");
  }
}

async function saveGameState() {
  const data = JSON.stringify(gameData);
  db.prepare(`
    INSERT INTO game_state (id, data) VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data
  `).run(data);
}

/* ===========================
   SOCKET.IO
=========================== */
let buzzerLocked = false;
let buzzerOwner = null;

io.on("connection", socket => {
  console.log("Server: Neuer Client verbunden");

  socket.emit("gameState", gameData);

  socket.on("requestGameState", () => {
    socket.emit("gameState", gameData);
  });

  socket.on("updateScore", async ({ playerId, delta }) => {
    const p = gameData.players.find(p => p.id === playerId);
    if (!p) return;

    p.score += delta;
    await saveGameState();
    io.emit("playersUpdate", gameData.players);
  });

  socket.on("hostSelectQuestion", async cell => {
    cell.status = "selected";
    gameData.currentQuestion = { ...cell, isOpen: true };
    await saveGameState();
    io.emit("showQuestion", gameData.currentQuestion);
  });

  socket.on("hostAnswer", async ({ correct }) => {
    const q = gameData.currentQuestion;
    if (!q) return;

    gameData.boardState.forEach(col =>
      col.forEach(c => {
        if (c.category === q.category && c.points === q.points) {
          c.status = "used";
        }
      })
    );

    gameData.currentQuestion.isOpen = false;
    await saveGameState();

    io.emit("gameState", gameData);
    io.emit("answerResult", { correct });
  });

  socket.on("resetQuestion", async cell => {
    gameData.boardState.forEach(col =>
      col.forEach(c => {
        if (c.category === cell.category && c.points === cell.points) {
          c.status = "available";
        }
      })
    );

    gameData.currentQuestion.isOpen = false;
    await saveGameState();
    io.emit("gameState", gameData);
  });

  socket.on("newGame", async () => {
    gameData.players.forEach(p => (p.score = 0));
    gameData.boardState.forEach(col =>
      col.forEach(c => (c.status = "available"))
    );
    gameData.currentQuestion.isOpen = false;

    await saveGameState();
    io.emit("gameState", gameData);
  });

  /* ===========================
     🔔 BUZZER
  ============================ */
  socket.on("buzz", ({ camId, name }) => {
    if (buzzerLocked) return;

    buzzerLocked = true;
    buzzerOwner = camId;

    io.emit("buzzerLocked", { camId, name });
  });

  socket.on("unlockBuzzer", () => {
    buzzerLocked = false;
    buzzerOwner = null;
    io.emit("buzzerUnlocked");
  });

  /* ===========================
     🗂️ BOARD MANAGER
  ============================ */
  socket.on("saveBoard", ({ name, json }) => {
    const boardState = createBoardFromJSON(json);
    db.prepare(`
      INSERT INTO boards (name, boardState) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET boardState=excluded.boardState
    `).run(name, JSON.stringify(boardState));

    socket.emit("boardSaved", { name });
    io.emit("boardsUpdated");
    console.log("Server: Board gespeichert:", name);
  });

  socket.on("getBoards", () => {
    const boards = db.prepare("SELECT name FROM boards ORDER BY name").all();
    socket.emit("boardsList", boards);
  });

  socket.on("loadBoard", ({ name }) => {
    const row = db.prepare("SELECT boardState FROM boards WHERE name = ?").get(name);
    if (!row) return;

    gameData.boardState = JSON.parse(row.boardState);
    gameData.currentQuestion.isOpen = false;

    saveGameState();
    io.emit("gameState", gameData);
    console.log("Server: Board geladen:", name);
  });

  socket.on("uploadBoardJSON", async json => {
    gameData.boardState = createBoardFromJSON(json);
    gameData.currentQuestion.isOpen = false;

    await saveGameState();
    io.emit("gameState", gameData);
  });
});

/* ===========================
   EXPRESS
=========================== */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/host", (_, res) =>
  res.sendFile(path.join(__dirname, "public/host.html"))
);

app.get("/screen", (_, res) =>
  res.sendFile(path.join(__dirname, "public/screen.html"))
);

app.get("/player", (_, res) =>
  res.sendFile(path.join(__dirname, "public/player.html"))
);

/* ===========================
   START SERVER
=========================== */
async function start() {
  await loadGameState();

  server.listen(PORT,"0.0.0.0",() => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error("❌ Server Start Fehler:", err);
  process.exit(1);
});
