const express = require('express');
const http = require('http');
const path = require('path');
const pty = require('node-pty');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 17076;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCROLLBACK_LIMIT = 50000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json());

// Named terminal sessions: { name -> { pty, outputBuffer, sockets, watermark } }
const terminals = new Map();

function createTerminal(name) {
  const ptyProcess = pty.spawn('bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: PROJECT_ROOT,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
  });

  const session = {
    pty: ptyProcess,
    outputBuffer: '',
    sockets: new Set(),
    watermark: 0
  };

  ptyProcess.onData((data) => {
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
  res.json({ status: 'ok', terminals: terminals.size });
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
    session.pty.write(data);
  });

  socket.on('resize', ({ cols, rows }) => {
    try {
      session.pty.resize(cols, rows);
    } catch (e) { /* ignore resize errors */ }
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
