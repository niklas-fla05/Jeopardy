const socket = io();
let players = [];
let boardState = [];
let currentCell = null;
let buzzerInfoEl;



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
    title.textContent = "Spieler / Cams";
    container.appendChild(title);

    players.forEach(player => {
        const row = document.createElement("div");
        row.className = "player-row";

        const nameInput = document.createElement("input");
        nameInput.value = player.name;
        nameInput.style.width = "160px";
        nameInput.onchange = () => {
            socket.emit("updatePlayerName", {
                playerId: player.id,
                name: nameInput.value
            });
        };

        const scoreSpan = document.createElement("span");
        scoreSpan.id = `player-${player.id}-score`;
        scoreSpan.textContent = `Punkte: ${player.score}`;

        const link = document.createElement("a");
        link.href = getPlayerLink(player.id);
        link.textContent = "Player öffnen";
        link.target = "_blank";
        link.style.color = "#ffae42";

        const plusBtn = document.createElement("button");
        plusBtn.textContent = "+100";
        plusBtn.onclick = () =>
            socket.emit("updateScore", { playerId: player.id, delta: 100 });

        const minusBtn = document.createElement("button");
        minusBtn.textContent = "-50";
        minusBtn.className = "btn-danger";
        minusBtn.onclick = () =>
            socket.emit("updateScore", { playerId: player.id, delta: -50 });

        row.appendChild(nameInput);
        row.appendChild(scoreSpan);
        row.appendChild(link);
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
        
        el.textContent = `Punkte: ${score}`;

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

function unlockBuzzer() {
    socket.emit("unlockBuzzer");
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

function getPlayerLink(camId) {
    return `${window.location.origin}/player?player=${camId}`;
}

// --- Boards laden und anzeigen ---
async function loadBoards() {
    try {
        const response = await fetch("/api/boards");
        if (!response.ok) throw new Error("Fehler beim Abrufen der Boards.");

        const boards = await response.json();
        const boardsList = document.getElementById("boards");
        boardsList.innerHTML = "";

        boards.forEach(board => {
            const li = document.createElement("li");
            li.textContent = board.name;
            li.onclick = () => {
                socket.emit("uploadBoardJSON", board);
                alert(`Board '${board.name}' wurde geladen.`);
            };
            boardsList.appendChild(li);
        });
    } catch (error) {
        console.error(error);
        alert("Fehler beim Laden der Boards.");
    }
}

// Boards beim Laden der Seite abrufen
loadBoards();

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

socket.on("buzzerUnlocked", () => {
    buzzerInfoEl.textContent = "Buzzer: frei";
});

socket.on("buzzerLocked", ({ camId, name }) => {
    buzzerInfoEl.textContent = `Gebuzzert: CAM ${camId} – ${name}`;
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

document.addEventListener("DOMContentLoaded", () => {
    buzzerInfoEl = document.getElementById("buzzerInfo");
});
