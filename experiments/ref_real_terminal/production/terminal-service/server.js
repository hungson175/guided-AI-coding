/**
 * Terminal Service - Node.js server with PTY, Socket.io, and raw WebSocket support.
 *
 * Features:
 * - JWT authentication (same key as FastAPI backend)
 * - API_TOKEN fallback for programmatic access
 * - Configurable CORS via ALLOWED_ORIGINS
 * - REST API for terminal operations
 * - Socket.io for real-time terminal connections
 * - Raw WebSocket on /terminal for legacy frontend compatibility
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from backend/.env
const dotenv = require('dotenv');
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const pty = require('node-pty');
const { Server: SocketIOServer } = require('socket.io');
const { WebSocketServer } = require('ws');
const url = require('url');

const {
  authMiddleware,
  verifySocketToken,
  verifyRawWebSocketToken,
} = require('./auth');

// Configuration
const PORT = process.env.PORT || 17071;
const SCROLLBACK_LIMIT = 50000; // chars to keep in output buffer
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:3334,https://voice-ui.hungson175.com'
).split(',').map(s => s.trim());

// Server startup time for uptime calculation
const startTime = Date.now();

// Express app
const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, etc.)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// Named terminal sessions: { name -> { pty, outputBuffer, sockets: Set, rawSockets: Set } }
const terminals = new Map();

/**
 * Create a new terminal session with PTY.
 */
function createTerminal(name) {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
  });

  const session = {
    pty: ptyProcess,
    outputBuffer: '',
    sockets: new Set(),      // Socket.io client IDs
    rawSockets: new Set(),   // Raw WebSocket clients
    watermark: 0,
  };

  // Capture all output for API reads and broadcast to clients
  ptyProcess.onData((data) => {
    session.outputBuffer += data;
    if (session.outputBuffer.length > SCROLLBACK_LIMIT) {
      session.outputBuffer = session.outputBuffer.slice(-SCROLLBACK_LIMIT);
    }

    // Forward to Socket.io clients
    session.watermark += data.length;
    for (const socketId of session.sockets) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) sock.emit('data', data);
    }

    // Forward to raw WebSocket clients
    for (const ws of session.rawSockets) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(data);
      }
    }

    // Flow control
    if (session.watermark > 100000) {
      ptyProcess.pause();
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log(`Terminal "${name}" exited with code ${exitCode}`);

    // Notify Socket.io clients
    for (const socketId of session.sockets) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) sock.emit('exit', exitCode);
    }

    // Close raw WebSocket clients
    for (const ws of session.rawSockets) {
      if (ws.readyState === 1) {
        ws.close(1000, 'Terminal exited');
      }
    }

    terminals.delete(name);
  });

  terminals.set(name, session);
  console.log(`Terminal "${name}" created`);
  return session;
}

/**
 * Get existing terminal or create new one.
 */
function getOrCreateTerminal(name) {
  return terminals.get(name) || createTerminal(name);
}

// ─── Health Check (No Auth Required) ────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    terminals: terminals.size,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

// ─── REST API (Auth Required) ───────────────────────────────

// List all terminal sessions
app.get('/api/terminals', authMiddleware, (req, res) => {
  const list = [];
  for (const [name, session] of terminals) {
    list.push({
      name,
      clients: session.sockets.size + session.rawSockets.size,
    });
  }
  res.json(list);
});

// Send text/command to a terminal
app.post('/api/terminals/:name/send', authMiddleware, (req, res) => {
  const { name } = req.params;
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Missing "data" field' });
  }

  const session = getOrCreateTerminal(name);
  session.pty.write(data);
  res.json({ ok: true, sent: data.length });
});

// Read recent output from a terminal
app.get('/api/terminals/:name/read', authMiddleware, (req, res) => {
  const { name } = req.params;
  const session = terminals.get(name);

  if (!session) {
    return res.status(404).json({ error: `Terminal "${name}" not found` });
  }

  const lines = parseInt(req.query.lines) || 0;
  let output = session.outputBuffer;

  if (lines > 0) {
    const allLines = output.split('\n');
    output = allLines.slice(-lines).join('\n');
  }

  res.json({ output });
});

// Clear output buffer
app.post('/api/terminals/:name/clear', authMiddleware, (req, res) => {
  const { name } = req.params;
  const session = terminals.get(name);

  if (!session) {
    return res.status(404).json({ error: `Terminal "${name}" not found` });
  }

  session.outputBuffer = '';
  res.json({ ok: true });
});

// Resize terminal
app.post('/api/terminals/:name/resize', authMiddleware, (req, res) => {
  const { name } = req.params;
  const { cols, rows } = req.body;
  const session = terminals.get(name);

  if (!session) {
    return res.status(404).json({ error: `Terminal "${name}" not found` });
  }

  try {
    const newCols = cols || 80;
    const newRows = rows || 30;
    session.pty.resize(newCols, newRows);
    res.json({ ok: true, cols: newCols, rows: newRows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Socket.io (New Protocol) ───────────────────────────────

const io = new SocketIOServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

// Socket.io authentication middleware
io.use(verifySocketToken);

io.on('connection', (socket) => {
  // Terminal name from query param, default to "default"
  const termName = socket.handshake.query.terminal || 'default';
  console.log(`[Socket.io] Client ${socket.id} connecting to terminal "${termName}"`);

  const session = getOrCreateTerminal(termName);
  session.sockets.add(socket.id);

  // Send existing scrollback so client sees history
  if (session.outputBuffer.length > 0) {
    socket.emit('data', session.outputBuffer);
  }

  // Flow control acknowledgment
  socket.on('ack', (bytes) => {
    session.watermark = Math.max(session.watermark - bytes, 0);
    if (session.watermark < 10000) {
      session.pty.resume();
    }
  });

  // Input from client to PTY
  socket.on('data', (data) => {
    session.pty.write(data);
  });

  // Resize event
  socket.on('resize', ({ cols, rows }) => {
    try {
      session.pty.resize(cols, rows);
    } catch (e) {
      // Ignore resize errors
    }
  });

  // Disconnect - don't kill PTY (persists for reconnection)
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client ${socket.id} disconnected from "${termName}"`);
    session.sockets.delete(socket.id);
  });
});

// ─── Raw WebSocket (/terminal) - Legacy Support ─────────────

const wss = new WebSocketServer({ noServer: true });

// Handle upgrade for /terminal path
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  if (pathname === '/terminal') {
    // Parse query params
    const parsed = url.parse(request.url, true);
    const token = parsed.query.token;
    const termName = parsed.query.terminal || 'default';

    // Verify token
    const authResult = verifyRawWebSocketToken(token);
    if (!authResult.valid) {
      console.log(`[WebSocket] Auth failed for /terminal: ${authResult.error}`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Upgrade to WebSocket
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.termName = termName;
      wss.emit('connection', ws, request);
    });
  } else {
    // Let Socket.io handle other paths
    // (Socket.io handles its own upgrade via engine.io)
  }
});

wss.on('connection', (ws) => {
  const termName = ws.termName || 'default';
  console.log(`[WebSocket] Client connected to terminal "${termName}"`);

  const session = getOrCreateTerminal(termName);
  session.rawSockets.add(ws);

  // Send existing scrollback
  if (session.outputBuffer.length > 0) {
    ws.send(session.outputBuffer);
  }

  // Handle messages from client
  ws.on('message', (data) => {
    const message = data.toString();

    // Try to parse as JSON (legacy protocol uses JSON for resize)
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
        try {
          session.pty.resize(parsed.cols, parsed.rows);
        } catch (e) {
          // Ignore resize errors
        }
        return;
      }
    } catch (e) {
      // Not JSON - treat as raw input
    }

    // Raw text input to PTY
    session.pty.write(message);
  });

  // Handle close
  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected from "${termName}"`);
    session.rawSockets.delete(ws);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`[WebSocket] Error for "${termName}":`, err.message);
    session.rawSockets.delete(ws);
  });
});

// ─── Start Server ───────────────────────────────────────────

// Only start if not in test mode (tests will import and manage lifecycle)
if (process.env.NODE_ENV !== 'test' && !module.parent) {
  server.listen(PORT, () => {
    console.log(`Terminal service running at http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`API: http://localhost:${PORT}/api/terminals`);
    console.log(`Socket.io: ws://localhost:${PORT}`);
    console.log(`Raw WebSocket: ws://localhost:${PORT}/terminal`);
    console.log(`CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });
} else {
  // For tests - start server on specified port
  server.listen(PORT);
}

module.exports = { app, server, io, terminals, wss };
