const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "gameData.json");

/* =========================
   DEFAULT BOARD
========================= */
const DEFAULT_CATEGORIES = ["CAT1","CAT2","CAT3","CAT4","CAT5"];
const DEFAULT_POINTS = [100,200,300,400,500];

function createEmptyBoard() {
    return DEFAULT_CATEGORIES.map(() =>
        DEFAULT_POINTS.map(() => "available")
    );
}

function createDummyBoard() {
    const categories = ["CAT 1", "CAT 2", "CAT 3", "CAT 4", "CAT 5"];
    const points = [100, 200, 300, 400, 500];

    return categories.map(cat =>
        points.map(pt => ({
            category: cat,
            points: pt,
            question: `Beispielfrage ${cat} ${pt}`,
            answer: `Beispielantwort ${cat} ${pt}`,
            status: "available" // available | selected | used
        }))
    );
}

/* =========================
   GAME STATE
========================= */
let gameData = {
    players: [
        { id: 1, name: "Spieler 1", score: 0 },
        { id: 2, name: "Spieler 2", score: 0 },
        { id: 3, name: "Spieler 3", score: 0 },
        { id: 4, name: "Spieler 4", score: 0 }
    ],
    boardState: createDummyBoard(),
    currentQuestion: {
        category: null,
        points: null,
        question: null,
        answer: null,
        isOpen: false
    }
};



/* =========================
   LOAD / SAVE
========================= */
if (fs.existsSync(DATA_FILE)) {
    try {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);

        gameData = {
            ...gameData,
            ...parsed
        };

        if (!Array.isArray(gameData.boardState) || !gameData.boardState.length) {
            gameData.boardState = createEmptyBoard();
        }

        console.log("✅ GameData geladen");
    } catch (err) {
        console.error("❌ Fehler beim Laden:", err);
    }
}

function saveGame() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2));
}

/* =========================
   SOCKET.IO
========================= */
io.on("connection", socket => {
    console.log("🔌 Client verbunden");

    socket.on("requestGameState", () => {
        socket.emit("gameState", gameData);
    });

    socket.on("hostSelectQuestion", data => {
        console.log("[SELECT]", data);

        gameData.currentQuestion = {
            ...data,
            isOpen: true
        };

        saveGame();
        io.emit("showQuestion", gameData.currentQuestion);
    });

    socket.on("hostAnswer", ({ correct }) => {
        console.log("[ANSWER]", correct);

        gameData.currentQuestion.isOpen = false;
        saveGame();

        io.emit("answerResult", { correct });
    });

    socket.on("updateBoardState", boardState => {
        gameData.boardState = boardState;
        saveGame();
        io.emit("boardStateUpdate", boardState);
    });

    socket.on("resetQuestion", () => {
        gameData.currentQuestion = {
            category: null,
            points: null,
            question: null,
            answer: null,
            isOpen: false
        };
        saveGame();
        io.emit("questionReset");
    });

    socket.on("newGame", () => {
        gameData.players.forEach(p => p.score = 0);
        gameData.boardState = createEmptyBoard();
        gameData.currentQuestion.isOpen = false;

        saveGame();
        io.emit("gameReset", gameData);
    });


    socket.on("closeGame", () => {
        saveGame();
        io.emit("gameClosed");
    });

    socket.on("updateScore", ({ playerId, delta }) => {
        const player = gameData.players.find(p => p.id === playerId);
        if (!player) return;

        player.score += delta;
        saveGame();

        io.emit("playersUpdate", gameData.players);
    });

});

/* =========================
   EXPRESS ROUTES
========================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) =>
    res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/host", (req, res) =>
    res.sendFile(path.join(__dirname, "public", "host.html"))
);

app.get("/screen", (req, res) =>
    res.sendFile(path.join(__dirname, "public", "screen.html"))
);

app.get("/api/game", (req, res) => {
    res.json(gameData);
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});
