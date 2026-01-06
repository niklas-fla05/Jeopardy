const socket = io();

const boardContainer = document.getElementById("boardContainer");
const overlay = document.getElementById("questionOverlay");
const qCategory = document.getElementById("qCategory");
const qPoints = document.getElementById("qPoints");
const qQuestion = document.getElementById("qQuestion");
const qAnswer = document.getElementById("qAnswer");

// Cam Scores unter jeder Cam
const camScores = [
    document.getElementById("score1"),
    document.getElementById("score2"),
    document.getElementById("score3"),
    document.getElementById("score4")
];

// Prüfen, ob alle Cam-Elemente existieren
camScores.forEach((el, i) => {
    if (!el) console.warn(`Cam Score Element score${i+1} existiert nicht im DOM`);
});

// Board rendern
function renderBoard(boardState) {
    if (!boardContainer) return;
    boardContainer.innerHTML = "";

    // Kategorien
    const categories = boardState.map(col => col[0]?.category || "Keine Kategorie");
    categories.forEach(cat => {
        const catDiv = document.createElement("div");
        catDiv.className = "category";
        catDiv.textContent = cat;
        boardContainer.appendChild(catDiv);
    });

    // Punkte-Zellen (max 5 Zeilen)
    const maxRows = 5;
    for (let row = 0; row < maxRows; row++) {
        for (let col = 0; col < boardState.length; col++) {
            const cellData = boardState[col][row];
            if (!cellData) continue;
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell";
            if (cellData.status === "used") cellDiv.classList.add("used");
            if (cellData.status === "selected") cellDiv.classList.add("selected");
            cellDiv.textContent = cellData.points;
            boardContainer.appendChild(cellDiv);
        }
    }
}

// Overlay für Frage (Antwort standardmäßig versteckt)
function showQuestion(q) {
    if (!overlay) return;
    overlay.classList.remove("hidden");
    qCategory.textContent = q.category;
    qPoints.textContent = q.points;
    qQuestion.textContent = q.question;
    qAnswer.textContent = q.answer; // Text setzen, aber versteckt
    qAnswer.classList.add("hidden"); // Antwort bleibt hidden
    boardContainer.classList.add("blurred");
}

// Host klickt auf "Antwort anzeigen"
function revealAnswer() {
    qAnswer.classList.remove("hidden");
}

// Overlay schließen (nach Richtig/Falsch)
function closeQuestion() {
    if (!overlay) return;
    overlay.classList.add("hidden");
    boardContainer.classList.remove("blurred");
}

// Punkte unter Cams aktualisieren
function updateCamScores(players) {
    if (!players || players.length === 0) return;
    players.forEach((p, i) => {
        const el = camScores[i];
        if (el) el.textContent = `Punkte: ${p.score}`;
    });
}

// --- SOCKET EVENTS ---
socket.on("gameState", data => {
    if (!data) return;
    renderBoard(data.boardState);
    updateCamScores(data.players);

    if (data.currentQuestion?.isOpen) {
        showQuestion(data.currentQuestion);
    } else {
        closeQuestion();
    }
});

socket.on("showQuestion", showQuestion);

socket.on("hostAnswer", data => {
    if (data.correct === null && data.question) {
        // Frage wird angezeigt, Antwort bleibt hidden
        showQuestion(data.question);
    }
});

socket.on("playersUpdate", players => {
    updateCamScores(players); // Punkte live aktualisieren
});

socket.on("screenRevealAnswer", data => {
    if (!data?.question) return;
    // Frage-Overlay auf Screen anzeigen, Antwort sichtbar machen
    qCategory.textContent = data.question.category;
    qPoints.textContent = data.question.points;
    qQuestion.textContent = data.question.question;
    qAnswer.textContent = data.question.answer;
    qAnswer.classList.remove("hidden");  // Antwort sichtbar
    overlay.classList.remove("hidden");
    boardContainer.classList.add("blurred");
});


// initial request
socket.emit("requestGameState");
