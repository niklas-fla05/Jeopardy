const board = document.querySelector('.board');
const cells = document.querySelectorAll('.cell');
const categories = document.querySelectorAll('.category');

let currentQuestionOverlay = null; 


function showQuestion(category, points, questionText, answerText) {
    
    let categoryIndex = Array.from(categories).findIndex(cat => cat.textContent === category);
    if (categoryIndex === -1) return console.warn("Kategorie nicht gefunden");

    let rowIndex = [100,200,300,400,500].indexOf(points);
    if (rowIndex === -1) return console.warn("Punkte nicht gefunden");

    let cellIndex = rowIndex * categories.length + categoryIndex;
    const targetCell = cells[cellIndex];

    
    board.style.filter = "blur(4px)";
    categories[categoryIndex].style.filter = "blur(2px)";
    targetCell.style.filter = "blur(2px)";

    if (!currentQuestionOverlay) {
        currentQuestionOverlay = document.createElement('div');
        currentQuestionOverlay.style.position = "absolute";
        currentQuestionOverlay.style.top = "0";
        currentQuestionOverlay.style.left = "0";
        currentQuestionOverlay.style.width = "100%";
        currentQuestionOverlay.style.height = "100%";
        currentQuestionOverlay.style.background = "rgba(0,0,0,0.85)";
        currentQuestionOverlay.style.color = "#ffae42";
        currentQuestionOverlay.style.display = "flex";
        currentQuestionOverlay.style.justifyContent = "center";
        currentQuestionOverlay.style.alignItems = "center";
        currentQuestionOverlay.style.textAlign = "center";
        currentQuestionOverlay.style.fontSize = "2rem";
        currentQuestionOverlay.style.zIndex = "1000";
        currentQuestionOverlay.style.padding = "20px";
        currentQuestionOverlay.style.flexDirection = "column";
        document.body.appendChild(currentQuestionOverlay);
    }

    currentQuestionOverlay.innerHTML = `
        <p id="question-text">${questionText}</p>
        <button onclick="showAnswer('${answerText}')">Show Answer</button>
        `;
}

function showAnswer(answerText) {
    if (!currentQuestionOverlay) return;
    currentQuestionOverlay.innerHTML = `<p id="answer-text">${answerText}</p>`;
}

function hidePoints() {
    cells.forEach(cell => cell.style.visibility = "hidden");
}

const socket = io();


socket.on('showQuestion', data => {
    showQuestion(data.category, data.points, data.question, data.answer);
});


socket.on('hidePoints', () => {
    hidePoints();
});