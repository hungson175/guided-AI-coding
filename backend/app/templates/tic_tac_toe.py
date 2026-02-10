TIC_TAC_TOE_HTML = """\
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .board {
      display: grid;
      grid-template-columns: repeat(3, 100px);
      gap: 5px;
      margin: 20px auto;
      background: #333;
      padding: 5px;
      border-radius: 5px;
    }
    button {
      width: 100px;
      height: 100px;
      font-size: 24px;
      font-weight: bold;
      border: none;
      cursor: pointer;
      background: white;
      color: #333;
      transition: all 0.3s;
    }
    button:hover {
      background: #f0f0f0;
    }
    button:disabled {
      cursor: not-allowed;
    }
    .status {
      font-size: 18px;
      margin: 20px 0;
      font-weight: bold;
      color: #667eea;
      min-height: 30px;
    }
    .reset-btn {
      padding: 10px 20px;
      font-size: 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
    }
    .reset-btn:hover {
      background: #764ba2;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Tic Tac Toe</h1>
    <div class="status" id="status">Player X's Turn</div>
    <div class="board" id="board"></div>
    <button class="reset-btn" onclick="resetGame()">New Game</button>
  </div>

  <script>
    let gameBoard = ['', '', '', '', '', '', '', '', ''];
    let currentPlayer = 'X';
    let gameActive = true;

    const winningConditions = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];

    function initBoard() {
      const board = document.getElementById('board');
      board.innerHTML = '';
      gameBoard.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.textContent = gameBoard[index];
        btn.onclick = () => playMove(index);
        btn.disabled = gameBoard[index] !== '';
        board.appendChild(btn);
      });
    }

    function playMove(index) {
      if (gameBoard[index] === '' && gameActive) {
        gameBoard[index] = currentPlayer;
        checkWin();
        if (gameActive) {
          currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
          updateStatus();
        }
        initBoard();
      }
    }

    function checkWin() {
      for (let condition of winningConditions) {
        const [a, b, c] = condition;
        if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
          updateStatus(`Player ${gameBoard[a]} Wins! \\u{1F389}`);
          gameActive = false;
          return;
        }
      }
      if (gameBoard.every(cell => cell !== '')) {
        updateStatus('Draw!');
        gameActive = false;
      }
    }

    function updateStatus(msg) {
      document.getElementById('status').textContent = msg || (gameActive ? `Player ${currentPlayer}'s Turn` : 'Game Over');
    }

    function resetGame() {
      gameBoard = ['', '', '', '', '', '', '', '', ''];
      currentPlayer = 'X';
      gameActive = true;
      updateStatus();
      initBoard();
    }

    initBoard();
  </script>
</body>
</html>"""
