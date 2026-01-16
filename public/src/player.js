const socket = io();

const params = new URLSearchParams(window.location.search);
const camId = Number(params.get("cam"));

const nameEl = document.getElementById("playerName");
const camEl = document.getElementById("camId");
const buzzBtn = document.getElementById("buzzBtn");

camEl.textContent = camId ?? "?";

if (!camId || camId < 1 || camId > 4) {
    nameEl.textContent = "UNGÜLTIGE CAM";
    buzzBtn.disabled = true;
}

/* --- Buzz --- */
buzzBtn.onclick = () => {
    buzzBtn.classList.add("locked");
    socket.emit("buzz", { camId });
};

/* --- Namen vom Host --- */
socket.on("playersUpdate", players => {
    const p = players.find(p => p.id === camId);
    if (p) nameEl.textContent = p.name;
});

/* --- Wenn jemand buzzert → alle sperren --- */
socket.on("buzzerLocked", () => {
    buzzBtn.classList.add("locked");
});

/* --- Host gibt frei --- */
socket.on("buzzerUnlocked", () => {
    buzzBtn.classList.remove("locked");
});

socket.emit("requestGameState");
