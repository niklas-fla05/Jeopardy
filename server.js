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

const defaultPlayers = [
    { id: 1, name: "Player 1", score: 0 },
    { id: 2, name: "Spieler 2", score: 0 },
    { id: 3, name: "Spieler 3", score: 0 },
    { id: 4, name: "Spieler 4", score: 0 }
];

let gameData = {
    players: [...defaultPlayers],
    boardState: [],
    currentQuestion: { isOpen: false }
};

function saveGame() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2));
}

if (fs.existsSync(DATA_FILE)) {
    try {
        const loaded = JSON.parse(fs.readFileSync(DATA_FILE));
        gameData.players = loaded.players && loaded.players.length ? loaded.players : [...defaultPlayers];
        gameData.boardState = loaded.boardState && loaded.boardState.length ? loaded.boardState : createDummyBoard();
        console.log("Server: Spiel geladen aus gameData.json");
    } catch (err) {
        console.log("Server: Fehler beim Laden von gameData.json, erstelle neues Spiel.");
        gameData.boardState = createDummyBoard();
        saveGame();
    }
} else {
    console.log("Server: gameData.json nicht gefunden, neues Spiel erstellt.");
    gameData.boardState = createDummyBoard();
    saveGame();
}

/* ---------- SOCKET ---------- */
io.on("connection", socket => {
    console.log("Server: Neuer Client verbunden");
    socket.emit("gameState", gameData);

    socket.on("requestGameState", () => {
        socket.emit("gameState", gameData);
    });

    socket.on("updateScore", ({ playerId, delta }) => {
        const p = gameData.players.find(p => p.id === playerId);
        if (!p) return;

        p.score += delta;
        console.log(`Server: Spieler ${p.name} (${p.id}) hat jetzt ${p.score} Punkte`);
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
        if (!q) return;

        if (correct === null) {
            io.emit("hostAnswer", { correct: null, question: q });
            return;
        }

        if (correct && gameData.players[0]) {
            
            console.log(`Server: Player 1 bekommt ${q.points} Punkte (jetzt ${gameData.players[0].score})`);
        }

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
        io.emit("answerResult", { correct });
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
        console.log("Server: Neues Spiel gestartet, Punkte zurückgesetzt.");
    });

    socket.on("hostRevealAnswer", ({ question }) => {
        io.emit("screenRevealAnswer", { question });
    });


    socket.on("closeGame", () => {
        saveGame();
        console.log("Server: Spiel geschlossen, Daten gespeichert.");
    });

    socket.on("updatePlayerName", ({ playerId, name }) => {
        const player = gameData.players.find(p => p.id === playerId);
        if (!player) return;

        player.name = name;
        console.log(`Server: Spieler ${playerId} heißt jetzt ${name}`);

        saveGame();
        io.emit("playersUpdate", gameData.players);
    });

    socket.on("uploadBoardJSON", json => {
        gameData.boardState = createBoardFromJSON(json);
        gameData.currentQuestion.isOpen = false;
        saveGame();
        io.emit("gameState", gameData);
        console.log("Server: Neues Board hochgeladen und gespeichert.");
    });
});

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
