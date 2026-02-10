const express = require('express');
const http = require('http');
const path = require('path');
const pty = require('node-pty');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 17075;
const SCROLLBACK_LIMIT = 50000; // chars to keep in output buffer

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Named terminal sessions: { name -> { pty, outputBuffer, sockets: Set } }
const terminals = new Map();

function createTerminal(name) {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
  });

  const session = {
    pty: ptyProcess,
    outputBuffer: '',
    sockets: new Set(),
    watermark: 0
  };

  // Capture all output for API reads
  ptyProcess.onData((data) => {
    session.outputBuffer += data;
    if (session.outputBuffer.length > SCROLLBACK_LIMIT) {
      session.outputBuffer = session.outputBuffer.slice(-SCROLLBACK_LIMIT);
    }

    // Forward to all connected WebSocket clients
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
  console.log(`Terminal "${name}" created`);
  return session;
}

// Get or create a terminal by name
function getOrCreateTerminal(name) {
  return terminals.get(name) || createTerminal(name);
}

// ─── REST API ────────────────────────────────────────────

// List all terminal sessions
app.get('/api/terminals', (req, res) => {
  const list = [];
  for (const [name, session] of terminals) {
    list.push({ name, clients: session.sockets.size });
  }
  res.json(list);
});

// Send text/command to a terminal
app.post('/api/terminals/:name/send', (req, res) => {
  const { name } = req.params;
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing "data" field' });

  const session = getOrCreateTerminal(name);
  session.pty.write(data);
  res.json({ ok: true, sent: data.length });
});

// Read recent output from a terminal
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

// Clear output buffer
app.post('/api/terminals/:name/clear', (req, res) => {
  const { name } = req.params;
  const session = terminals.get(name);
  if (!session) return res.status(404).json({ error: `Terminal "${name}" not found` });

  session.outputBuffer = '';
  res.json({ ok: true });
});

// Resize terminal
app.post('/api/terminals/:name/resize', (req, res) => {
  const { name } = req.params;
  const { cols, rows } = req.body;
  const session = terminals.get(name);
  if (!session) return res.status(404).json({ error: `Terminal "${name}" not found` });

  try {
    session.pty.resize(cols || 80, rows || 30);
    res.json({ ok: true, cols: cols || 80, rows: rows || 30 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── WebSocket ───────────────────────────────────────────

io.on('connection', (socket) => {
  // Terminal name from query param, default to "default"
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
    session.pty.write(data);
  });

  socket.on('resize', ({ cols, rows }) => {
    try {
      session.pty.resize(cols, rows);
    } catch (e) { /* ignore */ }
  });

  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected from "${termName}"`);
    session.sockets.delete(socket.id);
    // Don't kill PTY - it persists for API access and reconnection
  });
});

server.listen(PORT, () => {
  console.log(`Live Terminal server running at http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/terminals`);
});

module.exports = { app, server, io, terminals };
