// DOM Elements
const board = document.getElementById('game-board');
const status = document.getElementById('status');
const moveRightBtn = document.getElementById('move-right');
const moveDownBtn = document.getElementById('move-down');
const moveDiagonalBtn = document.getElementById('move-diagonal');
const undoBtn = document.getElementById('undo');
const resetBtn = document.getElementById('reset');
const historyList = document.getElementById('history-list');
const player1NameInput = document.getElementById('player1-name');
const player2NameInput = document.getElementById('player2-name');
const player1ScoreSpan = document.getElementById('player1-score');
const player2ScoreSpan = document.getElementById('player2-score');

// Game Variables
let frogPosition = { x: 0, y: 0 };
let currentPlayer = 1;
let moveHistory = [];
let scores = { 1: 0, 2: 0 };

// Initialize the game board
function createBoard() {
    board.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if ((row + col) % 2 === 0) {
                cell.classList.add('white');
            } else {
                cell.classList.add('black');
            }
            cell.id = `cell-${row}-${col}`;
            board.appendChild(cell);
        }
    }
    placeFrog();
    updateControls();
}

// Place the frog on the board
function placeFrog() {
    const frog = document.createElement('div');
    frog.classList.add('frog');
    const currentCell = document.getElementById(`cell-${frogPosition.y}-${frogPosition.x}`);
    currentCell.appendChild(frog);
}

// Move the frog to a new position
function moveFrog(newX, newY, moveType) {
    // Remove the frog from the current position
    const currentCell = document.getElementById(`cell-${frogPosition.y}-${frogPosition.x}`);
    currentCell.innerHTML = '';

    // Update the frog's position
    frogPosition.x = newX;
    frogPosition.y = newY;

    // Place the frog in the new position
    placeFrog();

    // Record the move
    moveHistory.push({ player: currentPlayer, x: newX, y: newY, moveType });
    updateMoveHistory();

    // Check for a win
    if (frogPosition.x === 7 && frogPosition.y === 7) {
        const winnerName = currentPlayer === 1 ? player1NameInput.value || 'Player 1' : player2NameInput.value || 'Player 2';
        status.textContent = `${winnerName} wins!`;
        scores[currentPlayer]++;
        updateScores();
        disableControls();
    } else {
        // Switch players
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateStatus();
        updateControls();
    }
}

// Update the move history display
function updateMoveHistory() {
    historyList.innerHTML = '';
    moveHistory.forEach((move, index) => {
        const moveItem = document.createElement('li');
        const playerName = move.player === 1 ? player1NameInput.value || 'Player 1' : player2NameInput.value || 'Player 2';
        moveItem.textContent = `${index + 1}. ${playerName}: ${move.moveType} to (${move.x + 1}, ${move.y + 1})`;
        historyList.appendChild(moveItem);
    });
}

// Undo the last move
function undoMove() {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory.pop();
    currentPlayer = lastMove.player;
    frogPosition.x = lastMove.x;
    frogPosition.y = lastMove.y;

    // Remove the frog from the current position
    const currentCell = document.getElementById(`cell-${frogPosition.y}-${frogPosition.x}`);
    currentCell.innerHTML = '';

    // Place the frog in the previous position
    if (moveHistory.length > 0) {
        const previousMove = moveHistory[moveHistory.length - 1];
        frogPosition.x = previousMove.x;
        frogPosition.y = previousMove.y;
    } else {
        frogPosition = { x: 0, y: 0 };
    }
    placeFrog();
    updateMoveHistory();
    updateStatus();
    updateControls();
}

// Update the status display
function updateStatus() {
    const playerName = currentPlayer === 1 ? player1NameInput.value || 'Player 1' : player2NameInput.value || 'Player 2';
    status.textContent = `${playerName}'s turn`;
}

// Update the scores display
function updateScores() {
    player1ScoreSpan.textContent = `Score: ${scores[1]}`;
    player2ScoreSpan.textContent = `Score: ${scores[2]}`;
}

// Update the control buttons based on the frog's position
function updateControls() {
    moveRightBtn.disabled = frogPosition.x >= 7;
    moveDownBtn.disabled = frogPosition.y >= 7;
    moveDiagonalBtn.disabled = frogPosition.x >= 7 || frogPosition.y >= 7;
    undoBtn.disabled = moveHistory.length === 0;
}

// Disable all control buttons
function disableControls() {
    moveRightBtn.disabled = true;
    moveDownBtn.disabled = true;
    moveDiagonalBtn.disabled = true;
    undoBtn.disabled = true;
}

// Reset the game
function resetGame() {
    frogPosition = { x: 0, y: 0 };
    currentPlayer = 1;
    moveHistory = [];
    createBoard();
    updateMoveHistory();
    updateStatus();
    updateControls();
}

// Event Listeners
moveRightBtn.addEventListener('click', () => moveFrog(frogPosition.x + 1, frogPosition.y, 'Right'));
moveDownBtn.addEventListener('click', () => moveFrog(frogPosition.x, frogPosition.y + 1, 'Down'));
moveDiagonalBtn.addEventListener('click', () => moveFrog(frogPosition.x + 1, frogPosition.y + 1, 'Diagonal'));
undoBtn.addEventListener('click', undoMove);
resetBtn.addEventListener('click', resetGame);

// Initialize the game
createBoard();
updateStatus();
updateScores();
