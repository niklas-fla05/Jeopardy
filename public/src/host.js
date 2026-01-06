const socket = io();
let players = [];
let boardState = [];
let currentCell = null;

function renderPlayers() {
    const ul = document.getElementById("playerList");
    ul.innerHTML = "";
    players.forEach(p => {
        ul.innerHTML += `
            <li>
                ${p.name} – ${p.score}
                <button onclick="socket.emit('updateScore',{playerId:${p.id},delta:100})">+100</button>
                <button onclick="socket.emit('updateScore',{playerId:${p.id},delta:-100})">-100</button>
            </li>`;
    });
}

function renderBoard() {
    const board = document.getElementById("miniBoard");
    board.innerHTML = "";
    boardState.forEach(col => {
        const c = document.createElement("div");
        c.className = "board-column";
        col.forEach(cell => {
            const d = document.createElement("div");
            d.className = "mini-cell " + cell.status;
            d.textContent = cell.points;
            d.onclick = () => {
                if (cell.status === "available") {
                    currentCell = cell;
                    socket.emit("hostSelectQuestion", cell);
                }
            };
            c.appendChild(d);
        });
        board.appendChild(c);
    });
}

function openQuestion(q) {
    document.getElementById("qCategory").textContent = q.category;
    document.getElementById("qPoints").textContent = q.points;
    document.getElementById("qText").textContent = q.question;
    document.getElementById("qAnswer").textContent = "Antwort: " + q.answer;
    document.getElementById("questionContainer").style.display = "block";
}

function markAnswer(correct) {
    socket.emit("hostAnswer", { correct });
    document.getElementById("questionContainer").style.display = "none";
}

function resetQuestion() {
    socket.emit("resetQuestion", currentCell);
    document.getElementById("questionContainer").style.display = "none";
}

function uploadJSON() {
    const file = document.getElementById("jsonFile").files[0];
    if (!file) return alert("Keine Datei gewählt");

    const reader = new FileReader();
    reader.onload = e => {
        socket.emit("uploadBoardJSON", JSON.parse(e.target.result));
    };
    reader.readAsText(file);
}

socket.on("gameState", data => {
    players = data.players;
    boardState = data.boardState;
    renderPlayers();
    renderBoard();
    if (data.currentQuestion?.isOpen) openQuestion(data.currentQuestion);
});

socket.on("playersUpdate", p => {
    players = p;
    renderPlayers();
});

socket.on("showQuestion", openQuestion);

socket.emit("requestGameState");