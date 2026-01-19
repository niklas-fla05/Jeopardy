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
            const li = document.createElement("li");
            li.textContent = board.name;
            boardsList.appendChild(li);
        });
    } catch (error) {
        console.error(error);
        alert("Fehler beim Laden der Boards.");
    }
}

// Boards beim Laden der Seite abrufen
loadBoards();