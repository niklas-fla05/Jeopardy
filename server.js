const fs = require("fs");
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "gameData.json");

/* ---------- HELPERS ---------- */
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
    return createBoardFromJSON(require("./public/example-board.json"));
}

/* ---------- GAME STATE ---------- */
let gameData = {
    players: [
        { id: 1, name: "Spieler 1", score: 0 },
        { id: 2, name: "Spieler 2", score: 0 },
        { id: 3, name: "Spieler 3", score: 0 },
        { id: 4, name: "Spieler 4", score: 0 }
    ],
    boardState: [],
    currentQuestion: {
        isOpen: false
    }
};

/* ---------- LOAD / SAVE ---------- */
function saveGame() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2));
}

if (fs.existsSync(DATA_FILE)) {
    gameData = JSON.parse(fs.readFileSync(DATA_FILE));
} else {
    gameData.boardState = createDummyBoard();
    saveGame();
}

/* ---------- SOCKET ---------- */
io.on("connection", socket => {

    socket.emit("gameState", gameData);

    socket.on("requestGameState", () => {
        socket.emit("gameState", gameData);
    });

    socket.on("updateScore", ({ playerId, delta }) => {
        const p = gameData.players.find(p => p.id === playerId);
        if (!p) return;
        p.score += delta;
        saveGame();
        io.emit("playersUpdate", gameData.players);
    });

    socket.on("hostSelectQuestion", cell => {
        cell.status = "selected";
        gameData.currentQuestion = { ...cell, isOpen: true };
        saveGame();
        io.emit("showQuestion", gameData.currentQuestion);
    });

    socket.on("hostAnswer", ({ correct }) => {
        const q = gameData.currentQuestion;
        gameData.boardState.forEach(col =>
            col.forEach(c => {
                if (c.category === q.category && c.points === q.points) {
                    c.status = "used";
                }
            })
        );
        gameData.currentQuestion.isOpen = false;
        saveGame();
        io.emit("gameState", gameData);
    });

    socket.on("resetQuestion", cell => {
        gameData.boardState.forEach(col =>
            col.forEach(c => {
                if (c.category === cell.category && c.points === cell.points) {
                    c.status = "available";
                }
            })
        );
        gameData.currentQuestion.isOpen = false;
        saveGame();
        io.emit("gameState", gameData);
    });

    socket.on("newGame", () => {
        gameData.players.forEach(p => p.score = 0);
        gameData.boardState.forEach(col =>
            col.forEach(c => c.status = "available")
        );
        gameData.currentQuestion.isOpen = false;
        saveGame();
        io.emit("gameState", gameData);
    });

    socket.on("closeGame", saveGame);

    socket.on("uploadBoardJSON", json => {
        gameData.boardState = createBoardFromJSON(json);
        gameData.currentQuestion.isOpen = false;
        saveGame();
        io.emit("gameState", gameData);
    });
});

/* ---------- EXPRESS ---------- */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/host", (_, res) =>
    res.sendFile(path.join(__dirname, "public/host.html"))
);

app.get("/screen", (_, res) =>
    res.sendFile(path.join(__dirname, "public/screen.html"))
);

server.listen(PORT, () =>
    console.log(`Server läuft auf http://localhost:${PORT}`)
);
