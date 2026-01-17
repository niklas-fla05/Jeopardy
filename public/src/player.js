const socket = io();

const boardContainer = document.getElementById("boardContainer");
const buzzBtn = document.getElementById("buzzBtn");
const buzzInfo = document.getElementById("buzzInfo");

const qCategory = document.getElementById("qCategory");
const qPoints = document.getElementById("qPoints");
const qQuestion = document.getElementById("qQuestion");
const qAnswer = document.getElementById("qAnswer");

// PLAYER-ID aus URL (?player=1)
const params = new URLSearchParams(window.location.search);
const playerId = Number(params.get("player") || 1);

/* ---------- BUZZ ---------- */
buzzBtn.onclick = () => {
    socket.emit("buzz", { camId: playerId });
};

/* ---------- BOARD ---------- */
function renderBoard(boardState) {
    boardContainer.innerHTML = "";

    const categories = boardState.map(col => col[0]?.category || "");
    categories.forEach(cat => {
        const d = document.createElement("div");
        d.className = "category";
        d.textContent = cat;
        boardContainer.appendChild(d);
    });

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < boardState.length; c++) {
            const cell = boardState[c][r];
            if (!cell) continue;
            const d = document.createElement("div");
            d.className = "cell";
            if (cell.status === "used") d.classList.add("used");
            d.textContent = cell.points;
            boardContainer.appendChild(d);
        }
    }
}

/* ---------- QUESTION ---------- */
function showQuestion(q) {
    qCategory.textContent = q.category;
    qPoints.textContent = `${q.points} Punkte`;
    qQuestion.textContent = q.question;
    qAnswer.textContent = q.answer;
    qAnswer.classList.add("hidden");
}

function closeQuestion() {
    qCategory.textContent = "";
    qPoints.textContent = "";
    qQuestion.textContent = "Warte auf Frage…";
    qAnswer.classList.add("hidden");
}

/* ---------- SOCKET ---------- */
socket.on("gameState", data => {
    renderBoard(data.boardState);

    const me = data.players.find(p => p.id === playerId);
    if (me) document.getElementById("playerName").textContent = me.name;

    if (data.currentQuestion?.isOpen) showQuestion(data.currentQuestion);
    else closeQuestion();
});

socket.on("showQuestion", showQuestion);

socket.on("screenRevealAnswer", data => {
    if (!data?.question) return;
    qAnswer.textContent = data.question.answer;
    qAnswer.classList.remove("hidden");
});

/* ---------- BUZZ LOCK ---------- */
socket.on("buzzerLocked", () => {
    buzzBtn.disabled = true;
    buzzInfo.classList.remove("hidden");
});

socket.on("buzzerUnlocked", () => {
    buzzBtn.disabled = false;
    buzzInfo.classList.add("hidden");
});

socket.emit("requestGameState");
