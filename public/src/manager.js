document.getElementById("upload-button").addEventListener("click", async () => {
    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];

    if (!file) {
        alert("Bitte wählen Sie eine JSON-Datei aus.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target.result);

            // Überprüfen, ob das 'name'-Feld vorhanden ist
            if (!json.name || typeof json.name !== "string" || json.name.trim() === "") {
                alert("Die JSON-Datei muss ein gültiges 'name'-Feld enthalten.");
                return;
            }

            const response = await fetch("/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(json)
            });

            if (response.ok) {
                alert("Board erfolgreich hochgeladen!");
                loadBoards();
            } else {
                alert("Fehler beim Hochladen des Boards.");
            }
        } catch (error) {
            alert("Ungültige JSON-Datei.");
        }
    };

    reader.readAsText(file);
});

async function loadBoards() {
    try {
        const response = await fetch("/api/boards");
        if (!response.ok) throw new Error("Fehler beim Abrufen der Boards.");

        const boards = await response.json();
        const boardsList = document.getElementById("boards");
        boardsList.innerHTML = "";

        boards.forEach(board => {
            const listItem = document.createElement("li");
            listItem.textContent = typeof board.name === "string" ? board.name : JSON.stringify(board.name);
            listItem.addEventListener("click", () => {
                displayBoard(board);
            });
            boardsList.appendChild(listItem);
        });
    } catch (error) {
        alert(error.message);
    }
}

let players = [];
let boardState = [];
let currentCell = null;

function renderBoard() {
    const board = document.getElementById("board-grid");
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
                    openQuestion(cell);
                }
            };
            colDiv.appendChild(cellDiv);
        });
        board.appendChild(colDiv);
    });
}

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
            // Update player name logic
        };

        const scoreSpan = document.createElement("span");
        scoreSpan.id = `player-${player.id}-score`;
        scoreSpan.textContent = `Punkte: ${player.score}`;

        const plusBtn = document.createElement("button");
        plusBtn.textContent = "+100";
        plusBtn.onclick = () => {
            // Update score logic
        };

        const minusBtn = document.createElement("button");
        minusBtn.textContent = "-100";
        minusBtn.className = "btn-danger";
        minusBtn.onclick = () => {
            // Update score logic
        };

        row.appendChild(nameInput);
        row.appendChild(scoreSpan);
        row.appendChild(plusBtn);
        row.appendChild(minusBtn);

        container.appendChild(row);
    });
}

function openQuestion(q) {
    currentCell = q;
    const container = document.getElementById("questionBox");
    container.querySelector("#qCategory").textContent = q.category;
    container.querySelector("#qPoints").textContent = q.points;
    container.querySelector("#qText").textContent = q.question;
    container.querySelector("#qAnswer").textContent = q.answer;
    container.classList.remove("hidden");
}

function displayBoard(board) {
    // Board-Details-Bereich leeren
    const boardDetails = document.getElementById("board-details");
    boardDetails.innerHTML = "";

    // Titel und Boardname editierbar
    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.gap = "1em";

    const title = document.createElement("h2");
    title.textContent = "Board: ";
    titleRow.appendChild(title);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = board.name;
    nameInput.style.fontSize = "1.2em";
    nameInput.style.fontWeight = "bold";
    nameInput.onchange = () => board.name = nameInput.value;
    titleRow.appendChild(nameInput);

    // Download-Button
    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "Download";
    downloadBtn.title = "Board als JSON herunterladen";
    downloadBtn.onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(board, null, 2));
        const dl = document.createElement("a");
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", (board.name || "jeopardy-board") + ".json");
        dl.click();
    };
    titleRow.appendChild(downloadBtn);

    // Löschen-Button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Löschen";
    deleteBtn.title = "Board löschen";
    deleteBtn.style.background = "#b71c1c";
    deleteBtn.style.color = "#fff";
    deleteBtn.onclick = async () => {
        if (confirm("Soll das Board wirklich gelöscht werden?")) {
            // Fallback: POST an /api/boards/delete mit Name im Body
            const response = await fetch("/api/boards/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: board.name })
            });
            if (response.ok) {
                alert("Board gelöscht!");
                loadBoards();
                boardDetails.innerHTML = "";
            } else {
                alert("Fehler beim Löschen!");
            }
        }
    };
    titleRow.appendChild(deleteBtn);

    boardDetails.appendChild(titleRow);

    // Kategorien und Fragen als editierbare Felder
    board.categories.forEach((category, catIdx) => {
        const catDiv = document.createElement("div");
        catDiv.style.margin = "1em 0";
        catDiv.style.border = "1px solid #ccc";
        catDiv.style.borderRadius = "8px";
        catDiv.style.padding = "0.5em 1em 1em 1em";
        catDiv.style.background = "#181818";

        // Kategorie-Name editierbar
        const catHeader = document.createElement("div");
        catHeader.style.display = "flex";
        catHeader.style.alignItems = "center";
        catHeader.style.gap = "0.5em";

        const catInput = document.createElement("input");
        catInput.type = "text";
        catInput.value = category.name;
        catInput.style.fontWeight = "bold";
        catInput.onchange = () => category.name = catInput.value;
        catHeader.appendChild(catInput);

        // Medien-Button (klein, toggelt Medienbereich)
        const mediaBtn = document.createElement("button");
        mediaBtn.textContent = "Medien verwalten";
        mediaBtn.style.fontSize = "0.8em";
        mediaBtn.style.padding = "2px 8px";
        mediaBtn.style.marginLeft = "0.5em";
        catHeader.appendChild(mediaBtn);
        catDiv.appendChild(catHeader);

        // Fragen-Tabelle
        const table = document.createElement("table");
        table.style.width = "100%";
        const header = document.createElement("tr");
        ["Punkte", "Frage", "Antwort"].forEach(h => {
            const th = document.createElement("th");
            th.textContent = h;
            header.appendChild(th);
        });
        table.appendChild(header);

        category.questions.forEach((q, qIdx) => {
            const row = document.createElement("tr");
            // Punkte
            const pointsTd = document.createElement("td");
            const pointsInput = document.createElement("input");
            pointsInput.type = "number";
            pointsInput.value = q.points;
            pointsInput.style.width = "70px";
            pointsInput.onchange = () => q.points = parseInt(pointsInput.value);
            pointsTd.appendChild(pointsInput);
            row.appendChild(pointsTd);
            // Frage
            const questionTd = document.createElement("td");
            const questionInput = document.createElement("input");
            questionInput.type = "text";
            questionInput.value = q.question;
            questionInput.style.width = "100%";
            questionInput.onchange = () => q.question = questionInput.value;
            questionTd.appendChild(questionInput);
            row.appendChild(questionTd);
            // Antwort
            const answerTd = document.createElement("td");
            const answerInput = document.createElement("input");
            answerInput.type = "text";
            answerInput.value = q.answer;
            answerInput.style.width = "100%";
            answerInput.onchange = () => q.answer = answerInput.value;
            answerTd.appendChild(answerInput);
            row.appendChild(answerTd);
            table.appendChild(row);
        });
        catDiv.appendChild(table);

        // Medienbereich (ausklappbar)
        const mediaDiv = document.createElement("div");
        mediaDiv.style.display = "none";
        mediaDiv.style.marginTop = "0.5em";
        mediaDiv.style.background = "#222";
        mediaDiv.style.padding = "0.5em";
        mediaDiv.style.borderRadius = "6px";

        category.questions.forEach((q, qIdx) => {
            const mediaRow = document.createElement("div");
            mediaRow.style.display = "flex";
            mediaRow.style.alignItems = "center";
            mediaRow.style.gap = "1em";
            mediaRow.style.marginBottom = "0.5em";
            const label = document.createElement("span");
            label.textContent = `Frage ${qIdx + 1}:`;
            label.style.minWidth = "70px";
            mediaRow.appendChild(label);
            // Musik
            // Spotify
            if (q.spotify) {
                const link = document.createElement("a");
                link.href = q.spotify;
                link.textContent = "Spotify öffnen";
                link.target = "_blank";
                link.style.color = "#1DB954";
                link.style.fontWeight = "bold";
                mediaRow.appendChild(link);
            }

            const spotifyInput = document.createElement("input");
            spotifyInput.type = "url";
            spotifyInput.placeholder = "Spotify-Link";
            spotifyInput.style.fontSize = "0.9em";
            spotifyInput.style.width = "220px";
            spotifyInput.value = q.spotify || "";
            spotifyInput.onchange = () => {
                q.spotify = spotifyInput.value.trim();
            };

            mediaRow.appendChild(spotifyInput);

            // Bild
            if (q.image) {
                const img = document.createElement("img");
                img.src = q.image;
                img.style.maxWidth = "60px";
                img.style.maxHeight = "60px";
                img.style.borderRadius = "4px";
                img.style.border = "1px solid #444";
                mediaRow.appendChild(img);
            }
            const imageInput = document.createElement("input");
            imageInput.type = "file";
            imageInput.accept = "image/*";
            imageInput.style.fontSize = "0.9em";
            imageInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file);

                try {
                    const res = await fetch("/api/upload-image", {
                        method: "POST",
                        body: formData
                    });

                    const data = await res.json();

                if (data.success && data.url) {
            
                    q.image = data.url;
                    console.log("Bild verlinkt im Board:", q.image);

            
                    displayBoard(board);
                    mediaDiv.style.display = "block";
                } else {
                    alert("Fehler beim Hochladen des Bildes.");
                }
                } catch (err) {
                     console.error("Upload-Fehler:", err);
                    alert("Fehler beim Hochladen des Bildes.");
                }
            };

            mediaRow.appendChild(imageInput);
            mediaDiv.appendChild(mediaRow);
        });
        catDiv.appendChild(mediaDiv);
        // Toggle Medienbereich
        mediaBtn.onclick = () => {
            mediaDiv.style.display = mediaDiv.style.display === "none" ? "block" : "none";
        };

        boardDetails.appendChild(catDiv);
    });

    // Speichern-Button
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Board speichern";
    saveBtn.style.marginTop = "1em";
    saveBtn.onclick = async () => {
        // Speichern via API
        const response = await fetch("/api/boards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(board)
        });
        if (response.ok) {
            alert("Board gespeichert!");
            loadBoards();
        } else {
            alert("Fehler beim Speichern!");
        }
    };
    boardDetails.appendChild(saveBtn);
}

// Leeres Board erstellen
document.getElementById("create-blank-board").addEventListener("click", () => {
    const emptyBoard = {
        name: "Neues Board",
        categories: [
            {
                name: "Kategorie 1",
                questions: [
                    { points: 100, question: "", answer: "" },
                    { points: 200, question: "", answer: "" },
                    { points: 300, question: "", answer: "" },
                    { points: 400, question: "", answer: "" },
                    { points: 500, question: "", answer: "" }
                ]
            },
            {
                name: "Kategorie 2",
                questions: [
                    { points: 100, question: "", answer: "" },
                    { points: 200, question: "", answer: "" },
                    { points: 300, question: "", answer: "" },
                    { points: 400, question: "", answer: "" },
                    { points: 500, question: "", answer: "" }
                ]
            },
            {
                name: "Kategorie 3",
                questions: [
                    { points: 100, question: "", answer: "" },
                    { points: 200, question: "", answer: "" },
                    { points: 300, question: "", answer: "" },
                    { points: 400, question: "", answer: "" },
                    { points: 500, question: "", answer: "" }
                ]
            },
            {
                name: "Kategorie 4",
                questions: [
                    { points: 100, question: "", answer: "" },
                    { points: 200, question: "", answer: "" },
                    { points: 300, question: "", answer: "" },
                    { points: 400, question: "", answer: "" },
                    { points: 500, question: "", answer: "" }
                ]
            },
            {
                name: "Kategorie 5",
                questions: [
                    { points: 100, question: "", answer: "" },
                    { points: 200, question: "", answer: "" },
                    { points: 300, question: "", answer: "" },
                    { points: 400, question: "", answer: "" },
                    { points: 500, question: "", answer: "" }
                ]
            }
        ]
    };

    displayBoard(emptyBoard);
});


// Boards beim Laden der Seite abrufen
loadBoards();