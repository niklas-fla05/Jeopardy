const socket = io();

const boardContainer = document.getElementById("boardContainer");
const overlay = document.getElementById("questionOverlay");
const qCategory = document.getElementById("qCategory");
const qPoints = document.getElementById("qPoints");
const qQuestion = document.getElementById("qQuestion");
const qAnswer = document.getElementById("qAnswer");


// Cam Scores
const camScores = [
    document.getElementById("score1"),
    document.getElementById("score2"),
    document.getElementById("score3"),
    document.getElementById("score4")
];

// Alle Cam-Divs
const camWrappers = document.querySelectorAll(".cam-wrapper");
const cams = document.querySelectorAll(".cam");


// Board rendern
function renderBoard(boardState) {
    if (!boardContainer) return;
    boardContainer.innerHTML = "";

    const categories = boardState.map(col => col[0]?.category || "Keine Kategorie");
    categories.forEach(cat => {
        const catDiv = document.createElement("div");
        catDiv.className = "category";
        catDiv.textContent = cat;
        boardContainer.appendChild(catDiv);
    });

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

// Overlay
function showQuestion(q) {
    overlay.classList.remove("hidden");
    qCategory.textContent = q.category;
    qPoints.textContent = q.points;
    qQuestion.textContent = q.question;
    qAnswer.textContent = q.answer;
    qAnswer.classList.add("hidden");
    boardContainer.classList.add("blurred");
}

function closeQuestion() {
    overlay.classList.add("hidden");
    boardContainer.classList.remove("blurred");
}

// Namen + Punkte
function updateCamScores(players) {
    if (!players) return;

    const nameSlots = document.querySelectorAll(".name-slot");

    players.forEach((p, i) => {
        const slotIndex = i < 2 ? i : i + 1;
        if (nameSlots[slotIndex]) nameSlots[slotIndex].textContent = p.name;
        if (camScores[i]) camScores[i].textContent = `Punkte: ${p.score}`;
    });
}


// =======================
// 🔔 BUZZER VISUALS
// =======================

// Wenn jemand buzzert → roter Rand + Glow
socket.on("buzzerLocked", ({ camId }) => {

    // Alle Buzz-Styles entfernen
    cams.forEach(cam => cam.classList.remove("buzzed"));

    // Player-ID → Cam-Index (Host überspringen)
    const camIndex = camId >= 3 ? camId + 1 : camId;

    const cam = cams[camIndex - 1];
    if (cam) cam.classList.add("buzzed");
});


// Wenn wieder freigegeben → alles normal
socket.on("buzzerUnlocked", () => {
    cams.forEach(cam => cam.classList.remove("buzzed"));
});


// SOCKET EVENTS
socket.on("gameState", data => {
    renderBoard(data.boardState);
    updateCamScores(data.players);

    if (data.currentQuestion?.isOpen) showQuestion(data.currentQuestion);
    else closeQuestion();
});

socket.on("showQuestion", showQuestion);
socket.on("playersUpdate", updateCamScores);
socket.on("screenRevealAnswer", data => {
    if (!data?.question) return;
    qCategory.textContent = data.question.category;
    qPoints.textContent = data.question.points;
    qQuestion.textContent = data.question.question;
    qAnswer.textContent = data.question.answer;
    qAnswer.classList.remove("hidden");
    overlay.classList.remove("hidden");
    boardContainer.classList.add("blurred");
});

socket.emit("requestGameState");
