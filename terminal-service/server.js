const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const pty = require('node-pty');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 17076;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCROLLBACK_LIMIT = 50000;
const TMUX_SESSION = 'guided_ai_coding';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Filter stray terminal Device Attributes responses that tmux leaks as visible text
// These are fragments like "1;2c", "0;276;0c" from DA query/response handshake
const DA_RESPONSE_RE = /\??\d+(?:;\d+)+c/g;
function filterStrayDA(data) {
  return data.replace(DA_RESPONSE_RE, '');
}

// Filter DA responses coming FROM the browser's xterm.js BEFORE they reach the PTY.
// When tmux queries terminal capabilities (DA1/DA2), xterm.js responds with escape
// sequences like \e[?1;2c or \e[>0;276;0c. These go: xterm.js → socket → PTY → tmux.
// But tmux passes them to the active pane's shell as keyboard input, causing
// "command not found" errors. Strip them here so they never reach tmux.
const DA_INPUT_RE = /\x1b\[[\?>]?[\d;]*c/g;
function filterDAInput(data) {
  return data.replace(DA_INPUT_RE, '');
}

// Named terminal sessions: { name -> { pty, outputBuffer, sockets, watermark, tmuxAttached } }
const terminals = new Map();

function createTerminal(name) {
  // Start with a bare bash shell — do NOT attach to tmux yet.
  // We wait for the browser's first resize so the PTY has the correct dimensions
  // before attaching. This prevents tmux from seeing an 80x30 viewport, which
  // would shrink the window and dump dot-fill artifacts into the scrollback.
  const ptyProcess = pty.spawn('bash', ['--norc', '--noprofile'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
  });

  const session = {
    pty: ptyProcess,
    outputBuffer: '',
    sockets: new Set(),
    watermark: 0,
    tmuxAttached: false,
  };

  ptyProcess.onData((rawData) => {
    // Suppress all output until tmux is attached (hides bare bash noise)
    if (!session.tmuxAttached) return;

    const data = filterStrayDA(rawData);
    if (!data) return;

    session.outputBuffer += data;
    if (session.outputBuffer.length > SCROLLBACK_LIMIT) {
      session.outputBuffer = session.outputBuffer.slice(-SCROLLBACK_LIMIT);
    }

    session.watermark += data.length;
    for (const socketId of session.sockets) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) sock.emit('data', data);
    }

    if (session.watermark > 100000) {
      ptyProcess.pause();
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log(`Terminal "${name}" exited with code ${exitCode}`);
    for (const socketId of session.sockets) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) sock.emit('exit', exitCode);
    }
    terminals.delete(name);
  });

  terminals.set(name, session);
  console.log(`Terminal "${name}" created (cwd: ${PROJECT_ROOT})`);
  return session;
}

function attachTmux(session) {
  if (session.tmuxAttached) return;
  session.tmuxAttached = true;
  // exec replaces the bare bash with tmux — PTY is already at the correct size
  session.pty.write(`stty -echo && exec tmux attach-session -t ${TMUX_SESSION}\r`);
  console.log(`Attached tmux session "${TMUX_SESSION}"`);
}

function getOrCreateTerminal(name) {
  return terminals.get(name) || createTerminal(name);
}

// ─── REST API ────────────────────────────────────────────

app.get('/api/terminals', (req, res) => {
  const list = [];
  for (const [name, session] of terminals) {
    list.push({ name, clients: session.sockets.size });
  }
  res.json(list);
});

app.post('/api/terminals/:name/send', (req, res) => {
  const { name } = req.params;
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing "data" field' });

  const session = getOrCreateTerminal(name);
  session.pty.write(data);
  res.json({ ok: true, sent: data.length });
});

app.get('/api/terminals/:name/read', (req, res) => {
  const { name } = req.params;
  const session = terminals.get(name);
  if (!session) return res.status(404).json({ error: `Terminal "${name}" not found` });

  const lines = parseInt(req.query.lines) || 0;
  let output = session.outputBuffer;

  if (lines > 0) {
    const allLines = output.split('\n');
    output = allLines.slice(-lines).join('\n');
  }

  res.json({ output });
});

app.get('/health', (req, res) => {
  const { execSync } = require('child_process');
  let tmuxReady = false;
  try {
    execSync(`tmux has-session -t ${TMUX_SESSION} 2>/dev/null`);
    tmuxReady = true;
  } catch {}
  res.json({ status: 'ok', terminals: terminals.size, tmuxSession: tmuxReady });
});

// ─── WebSocket ───────────────────────────────────────────

io.on('connection', (socket) => {
  const termName = socket.handshake.query.terminal || 'default';
  console.log(`Client ${socket.id} connecting to terminal "${termName}"`);

  const session = getOrCreateTerminal(termName);
  session.sockets.add(socket.id);

  // Send existing scrollback so client sees history
  if (session.outputBuffer.length > 0) {
    socket.emit('data', session.outputBuffer);
  }

  socket.on('ack', (bytes) => {
    session.watermark = Math.max(session.watermark - bytes, 0);
    if (session.watermark < 10000) {
      session.pty.resume();
    }
  });

  socket.on('data', (data) => {
    const filtered = filterDAInput(data);
    if (filtered) session.pty.write(filtered);
  });

  socket.on('resize', ({ cols, rows }) => {
    try {
      session.pty.resize(cols, rows);
    } catch (e) { /* ignore resize errors */ }

    // Attach to tmux after first resize — PTY now has the browser's real dimensions
    attachTmux(session);
  });

  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected from "${termName}"`);
    session.sockets.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Terminal service running at http://localhost:${PORT}`);
  console.log(`CWD: ${PROJECT_ROOT}`);
});
