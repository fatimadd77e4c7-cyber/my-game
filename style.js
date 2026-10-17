
const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const soundBtn = document.getElementById("soundBtn");
const modeSelect = document.getElementById("mode");

const xScoreText = document.getElementById("xScore");
const oScoreText = document.getElementById("oScore");
const xName = document.getElementById("xName");
const oName = document.getElementById("oName");
const xCard = document.getElementById("xCard");
const oCard = document.getElementById("oCard");

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let soundOn = true;
let scores = { X: 0, O: 0 };
let audioContext = null;
let aiTimer = null;

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

// SOUND EFFECTS
function playSound(type) {
  if (!soundOn) return;

  try {
    const AudioCtx =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) return;

    if (!audioContext) audioContext = new AudioCtx();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const sounds = {
      click: [
        { f: 520, d: 0.07, w: "sine" }
      ],
      restart: [
        { f: 390, d: 0.08, w: "sine" },
        { f: 560, d: 0.10, w: "sine" }
      ],
      win: [
        { f: 523, d: 0.14, w: "sine" },
        { f: 659, d: 0.14, w: "sine" },
        { f: 784, d: 0.25, w: "sine" }
      ],
      lose: [
        { f: 392, d: 0.17, w: "triangle" },
        { f: 330, d: 0.17, w: "triangle" },
        { f: 262, d: 0.30, w: "triangle" }
      ],
      draw: [
        { f: 440, d: 0.12, w: "sine" },
        { f: 440, d: 0.20, w: "sine" }
      ]
    };

    let start = audioContext.currentTime;

    sounds[type].forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = note.w;
      oscillator.frequency.setValueAtTime(note.f, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        0.12, start + 0.015
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001, start + note.d
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(start);
      oscillator.stop(start + note.d + 0.02);

      start += note.d * 0.85;
    });
  } catch (error) {
    // Game will continue even if sound is unavailable.
  }
}

// SCOREBOARD AND PLAYER TURN
function updateScores() {
  xScoreText.textContent = scores.X;
  oScoreText.textContent = scores.O;
}

function updateTurn() {
  xCard.classList.toggle("active", currentPlayer === "X");
  oCard.classList.toggle("active", currentPlayer === "O");
}

function updateNames() {
  if (modeSelect.value === "computer") {
    xName.textContent = "You";
    oName.textContent = "Computer";
  } else {
    xName.textContent = "Player 1";
    oName.textContent = "Player 2";
  }
}

// CHECK WIN
function getWinningLine(player) {
  return winningLines.find(line =>
    line.every(index => board[index] === player)
  );
}

// FINISH GAME
function finishGame(player) {
  gameOver = true;
  clearTimeout(aiTimer);
  aiTimer = null;

  if (player) {
    const line = getWinningLine(player);

    line.forEach(index => {
      cells[index].classList.add("winner");
    });

    scores[player]++;
    updateScores();

    if (
      modeSelect.value === "computer" &&
      player === "O"
    ) {
      statusText.textContent = "Computer wins! 😢";
      playSound("lose");
    } else {
      statusText.textContent = player + " wins! 🎉";
      playSound("win");
    }
  } else {
    statusText.textContent = "It's a draw! 🤝";
    playSound("draw");
  }

  cells.forEach(cell => {
    cell.disabled = true;
  });

  updateTurn();
}

// PLAYER CLICK
function makeMove(index) {
  if (gameOver || board[index] !== "") return;

  // Only allow the human to play as X in computer mode.
  if (
    modeSelect.value === "computer" &&
    currentPlayer !== "X"
  ) {
    return;
  }

  placeMove(index, currentPlayer);
}

// MAKE A MOVE
function placeMove(index, player) {
  if (gameOver || board[index] !== "") return;

  board[index] = player;
  cells[index].textContent = player;
  cells[index].classList.add(player.toLowerCase());
  cells[index].disabled = true;

  playSound("click");

  if (getWinningLine(player)) {
    finishGame(player);
    return;
  }

  if (board.every(cell => cell !== "")) {
    finishGame(null);
    return;
  }

  // Switch turns
  currentPlayer = player === "X" ? "O" : "X";
  updateTurn();

  // COMPUTER TURN
  if (
    modeSelect.value === "computer" &&
    currentPlayer === "O"
  ) {
    statusText.textContent = "Computer is thinking... 🤔";

    // Lock cells while computer is thinking.
    cells.forEach(cell => {
      cell.disabled = true;
    });

    aiTimer = setTimeout(() => {
      aiTimer = null;
      computerMove();
    }, 450);

    return;
  }

  // IMPORTANT: Re-enable all empty cells.
  // This fixes the issue where X cannot click again.
  cells.forEach((cell, i) => {
    cell.disabled = board[i] !== "";
  });

  statusText.textContent = currentPlayer + "'s turn to play!";
}

// FIND WINNING OR BLOCKING MOVE
function findBestMove(player) {
  for (let i = 0; i < 9; i++) {
    if (board[i] !== "") continue;

    board[i] = player;
    const wins = Boolean(getWinningLine(player));
    board[i] = "";

    if (wins) return i;
  }

  return -1;
}

// COMPUTER LOGIC
function computerMove() {
  if (gameOver || currentPlayer !== "O") return;

  let move = findBestMove("O");

  // Block the player's winning move.
  if (move === -1) {
    move = findBestMove("X");
  }

  // Prefer the center.
  if (move === -1 && board[4] === "") {
    move = 4;
  }

  // Otherwise choose a corner, then a side.
  if (move === -1) {
    const corners = [0, 2, 6, 8].filter(
      i => board[i] === ""
    );

    const choices = corners.length
      ? corners
      : [1, 3, 5, 7].filter(i => board[i] === "");

    if (choices.length > 0) {
      move = choices[
        Math.floor(Math.random() * choices.length)
      ];
    }
  }

  if (move !== -1 && move !== undefined) {
    placeMove(move, "O");
  }
}

// RESTART GAME
function restartGame(playRestartSound = true) {
  clearTimeout(aiTimer);
  aiTimer = null;

  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;

  cells.forEach(cell => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("x", "o", "winner");
  });

  updateNames();
  updateTurn();

  statusText.textContent = "X's turn to play!";

  if (playRestartSound) {
    playSound("restart");
  }
}

// EVENT LISTENERS
cells.forEach(cell => {
  cell.addEventListener("click", () => {
    makeMove(Number(cell.dataset.index));
  });
});

restartBtn.addEventListener("click", () => {
  restartGame(true);
});

modeSelect.addEventListener("change", () => {
  restartGame(false);
});

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;

  soundBtn.textContent = soundOn ? "🔊" : "🔇";
  soundBtn.setAttribute(
    "aria-label",
    soundOn ? "Mute sound" : "Enable sound"
  );

  if (soundOn) playSound("click");
});

// START GAME
updateScores();
restartGame(false);
