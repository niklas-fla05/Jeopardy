const socket = io();
let players = [];
let boardState = [];
let currentCell = null;

// --- Board rendern ---
function renderBoard() {
    const board = document.getElementById("miniBoard");
    board.innerHTML = "";
    boardState.forEach(col => {
        const colDiv = document.createElement("div");
        colDiv.className = "board-column";
        col.forEach(cell => {
            const cellDiv = document.createElement("div");
            cellDiv.className = "mini-cell " + cell.status;
            cellDiv.textContent = cell.points;
            cellDiv.onclick = () => {
                if (cell.status === "available") {
                    currentCell = cell;
                    socket.emit("hostSelectQuestion", cell);
                }
            };
            colDiv.appendChild(cellDiv);
        });
        board.appendChild(colDiv);
    });
}

// --- Spieler Controls rendern ---
function renderPlayerControls() {
    const container = document.getElementById("playerControls");
    container.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "Spieler Punkte";
    container.appendChild(title);

    // 4 Spieler sicherstellen
    if (players.length === 0) {
        players = [
            { id: 1, name: "Spieler 1", score: 0 },
            { id: 2, name: "Spieler 2", score: 0 },
            { id: 3, name: "Spieler 3", score: 0 },
            { id: 4, name: "Spieler 4", score: 0 }
        ];
    }

    players.forEach(player => {
        const row = document.createElement("div");
        row.className = "player-row";

        const nameSpan = document.createElement("span");
        nameSpan.id = `player-${player.id}-score`;
        nameSpan.textContent = `${player.name} – Punkte: ${player.score}`;

        // +100 Button
        const plusBtn = document.createElement("button");
        plusBtn.textContent = "+100";
        plusBtn.onclick = () => socket.emit("updateScore", { playerId: player.id, delta: 100 });

        // -100 Button
        const minusBtn = document.createElement("button");
        minusBtn.textContent = "-100";
        minusBtn.className = "btn-danger";
        minusBtn.onclick = () => socket.emit("updateScore", { playerId: player.id, delta: -100 });

        row.appendChild(nameSpan);
        row.appendChild(plusBtn);
        row.appendChild(minusBtn);

        container.appendChild(row);
    });
}

// --- Punkte live aktualisieren ---
function updatePlayerScoreUI(playerId, score) {
    const el = document.getElementById(`player-${playerId}-score`);
    if (el) {
        const player = players.find(p => p.id === playerId);
        el.textContent = `${player.name} – Punkte: ${score}`;
    }
}

function openQuestion(q) {
    currentCell = q;
    const container = document.getElementById("questionBox");
    container.classList.remove("hidden");
    document.getElementById("qCategory").textContent = q.category;
    document.getElementById("qPoints").textContent = q.points;
    document.getElementById("qText").textContent = q.question;
    document.getElementById("qAnswer").textContent = q.answer; // Antwort direkt anzeigen
}


// --- Antwort anzeigen ---
function revealAnswerOnScreen() {
    if (!currentCell) return;
    // Nur Socket senden, kein DOM ändern auf dem Host
    socket.emit("hostRevealAnswer", { question: currentCell });
}



// --- Richtig / Falsch markieren ---
function markAnswer(correct) {
    if (!currentCell) return;
    socket.emit("hostAnswer", { correct });
    document.getElementById("questionBox").classList.add("hidden");
    currentCell = null;
}

// --- Frage zurücksetzen ---
function resetQuestion() {
    if (!currentCell) return;
    socket.emit("resetQuestion", currentCell);
    document.getElementById("questionBox").classList.add("hidden");
    currentCell = null;
}

// --- JSON Board hochladen ---
function uploadJSON() {
    const file = document.getElementById("jsonFile").files[0];
    if (!file) return alert("Keine Datei gewählt");
    const reader = new FileReader();
    reader.onload = e => socket.emit("uploadBoardJSON", JSON.parse(e.target.result));
    reader.readAsText(file);
}

// --- Socket Events ---
socket.on("gameState", data => {
    players = data.players.length ? data.players : [
        { id: 1, name: "Spieler 1", score: 0 },
        { id: 2, name: "Spieler 2", score: 0 },
        { id: 3, name: "Spieler 3", score: 0 },
        { id: 4, name: "Spieler 4", score: 0 }
    ];
    boardState = data.boardState;
    renderBoard();
    renderPlayerControls();
    if (data.currentQuestion?.isOpen) openQuestion(data.currentQuestion);
});

// Punkte live aktualisieren
socket.on("playersUpdate", data => {
    players = data;
    players.forEach(p => updatePlayerScoreUI(p.id, p.score));
});

// Frage anzeigen
socket.on("showQuestion", openQuestion);

// Antwort anzeigen (wenn andere Clients)
socket.on("hostAnswer", ({ correct, question }) => {
    if (question) openQuestion(question);
});

socket.emit("requestGameState");
