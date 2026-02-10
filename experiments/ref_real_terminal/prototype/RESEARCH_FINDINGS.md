# Live Terminal MVP - Research Findings

**Date:** 2026-02-09
**Researcher:** TL
**Status:** Research Complete

---

## Executive Summary

Creating a TRUE live terminal in the browser (100% identical to local terminal) requires:
- **xterm.js** (frontend terminal emulator)
- **node-pty** (backend PTY with native bindings)
- **WebSocket** (real-time bidirectional transport)

This is a **proven, production-ready architecture** used by VS Code, JupyterLab, and major IDEs.

---

## Core Architecture

### Three-Layer Stack

```
Browser (xterm.js)  ←→  WebSocket  ←→  Node.js (node-pty)  ←→  Shell PTY
```

**xterm.js** (Frontend)
- Full-featured terminal emulation in JavaScript
- Renders terminal UI, handles ANSI escape sequences
- Does NOT interpret commands - only provides interface
- Production use: VS Code, Theia, JupyterLab

**node-pty** (Backend)
- Forks pseudoterminals with native bindings
- Provides TRUE PTY semantics (read/write streams)
- Maintained by Microsoft (powers VS Code)
- Platform support: Linux/macOS (libutil), Windows (ConPTY API)

**WebSocket**
- Full-duplex bidirectional communication
- Libraries: Socket.io, ws, or native WebSockets

---

## Minimal Working Implementation

### Backend (server.js) - 30 lines

```javascript
const express = require('express');
const http = require('http');
const pty = require('node-pty');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  ptyProcess.onData(data => socket.emit('data', data));
  socket.on('data', data => ptyProcess.write(data));
  socket.on('resize', ({ cols, rows }) => ptyProcess.resize(cols, rows));
  socket.on('disconnect', () => ptyProcess.kill());
});

server.listen(3000, () => console.log('Server on http://localhost:3000'));
```

### Frontend (index.html) - 20 lines

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
  <script src="/socket.io/socket.io.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
</head>
<body>
  <div id="terminal"></div>
  <script>
    const socket = io();
    const term = new Terminal({ cursorBlink: true });
    const fitAddon = new FitAddon.FitAddon();

    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    term.onData(data => socket.emit('data', data));
    socket.on('data', data => term.write(data));
    term.onResize(({ cols, rows }) => socket.emit('resize', { cols, rows }));
    window.addEventListener('resize', () => fitAddon.fit());
  </script>
</body>
</html>
```

**That's it.** 50 lines total for a functional web terminal.

---

## CRITICAL: Flow Control (Performance)

**Problem:** Fast output (like `cat large-file` or `yes`) can overwhelm xterm.js:
- Sluggish UI that doesn't respond to keystrokes
- Buffer overflow (50MB hardcoded limit)
- Potential crashes

### Solution: Watermark-Based Flow Control

```javascript
const HIGH = 100000;  // Max 500K to keep terminal snappy
const LOW = 10000;
let watermark = 0;

ptyProcess.onData(chunk => {
  watermark += chunk.length;

  term.write(chunk, () => {
    watermark = Math.max(watermark - chunk.length, 0);
    if (watermark < LOW) {
      ptyProcess.resume();
    }
  });

  if (watermark > HIGH) {
    ptyProcess.pause();
  }
});
```

**Test:** Run `yes` then press Ctrl-C - terminal should respond immediately.

---

## Reference Implementations

### Production Tools Using This Stack

| Tool | Frontend | Backend | Notes |
|------|----------|---------|-------|
| **VS Code** | xterm.js | node-pty | Custom addons, ConPTY on Windows 10+ |
| **JupyterLab** | xterm.js | terminado (Python) | Tornado WebSockets |
| **wetty** | xterm.js | node-pty | SSH support, GitHub: butlerx/wetty |
| **ttyd** | xterm.js | C + libwebsockets | Single binary, minimal deps |

---

## Essential xterm.js Addons

```bash
npm install xterm xterm-addon-fit xterm-addon-web-links
```

```javascript
import { FitAddon } from 'xterm-addon-fit';        // Auto-resize
import { WebLinksAddon } from 'xterm-addon-web-links';  // Clickable URLs
import { SearchAddon } from 'xterm-addon-search';      // Ctrl+F search

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.loadAddon(new WebLinksAddon());
```

---

## Key Technical Patterns

### PTY Creation Best Practices

```javascript
const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-256color',  // Terminal type
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: {
    ...process.env,
    TERM: 'xterm-256color',    // Ensure color support
    COLORTERM: 'truecolor'     // 24-bit color
  },
  encoding: null  // Return buffers for binary data
});
```

### Terminal Resize Handling

```javascript
// Frontend
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

window.addEventListener('resize', () => {
  fitAddon.fit();
  socket.emit('resize', { cols: term.cols, rows: term.rows });
});

// Backend
socket.on('resize', ({ cols, rows }) => {
  ptyProcess.resize(cols, rows);
});
```

### Multi-User Session Management

```javascript
const sessions = new Map();

io.on('connection', (socket) => {
  const sessionId = socket.id;
  const ptyProcess = pty.spawn(shell, [], options);
  sessions.set(sessionId, ptyProcess);

  socket.on('disconnect', () => {
    const pty = sessions.get(sessionId);
    pty.kill();
    sessions.delete(sessionId);
  });
});
```

---

## Common Pitfalls & Solutions

### ❌ Terminal doesn't resize properly
**Solution:** Use FitAddon and sync cols/rows with backend PTY

### ❌ Terminal freezes on large outputs
**Solution:** Implement watermark-based flow control (see above)

### ❌ Colors don't work correctly
**Solution:** Set `TERM=xterm-256color` and `name: 'xterm-color'` in PTY options

### ❌ Security vulnerabilities
**Solutions:**
- Never pass user input directly to shell commands
- Use Docker containers to isolate PTY processes
- Implement authentication on WebSocket connections
- All processes inherit parent permissions - use minimal privileges
- node-pty is NOT thread-safe

---

## Security Hardening (Production)

### Restrict Origins

```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true
  }
});
```

### Authentication

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (isValidToken(token)) {
    next();
  } else {
    next(new Error('Authentication failed'));
  }
});
```

### Container-Based Isolation

```javascript
// Launch PTY in ephemeral container
const ptyProcess = pty.spawn('docker', [
  'run', '-it', '--rm',
  '--network', 'none',  // No network access
  '--memory', '512m',   // Memory limit
  '--cpus', '0.5',      // CPU limit
  'alpine:latest', 'sh'
], options);
```

---

## Modern Best Practices (2026)

### Latest Stable Versions

```json
{
  "dependencies": {
    "xterm": "^5.3.0",          // Unicode 11, WebGL renderer
    "xterm-addon-fit": "^0.8.0",
    "node-pty": "^1.1.0",       // ConPTY support
    "socket.io": "^4.6.0",      // Better performance
    "express": "^4.18.0"
  }
}
```

### WebGL Renderer for Performance

```javascript
const term = new Terminal({
  rendererType: 'webgl',     // Much faster than canvas
  allowTransparency: false   // Required for WebGL
});
```

---

## Integration with Current Backend (FastAPI)

Our current backend is FastAPI (Python). Two approaches:

### Option 1: Separate Node.js Service (Recommended)
- Keep terminal service as separate Node.js microservice (like current setup)
- FastAPI backend proxies to terminal service
- Clean separation of concerns
- **Current architecture already follows this pattern** (port 17071)

### Option 2: Python Terminal Service
- Use `terminado` (Python PTY wrapper) instead of node-pty
- Tornado WebSockets (built into terminado)
- xterm.js frontend stays the same
- **Trade-off:** Less mature than node-pty, fewer features

**Recommendation:** Stick with Node.js terminal service (Option 1) - more mature ecosystem.

---

## Next Steps (Phase 2 - Implementation)

1. **Setup:** Create `experiments/live-terminal/` with minimal working example
2. **Test locally:** Verify true PTY behavior (autocomplete, colors, Ctrl+C)
3. **Add flow control:** Implement watermark-based throttling
4. **Security:** Add authentication and origin restrictions
5. **Integration:** Connect to existing FastAPI backend
6. **Production hardening:** Container isolation, monitoring

---

## Estimated Complexity

**Minimal working version:** 1-2 hours (50 lines of code)
**Production-ready version:** 1 day (authentication, flow control, error handling)
**Full integration:** 2-3 days (testing, security, monitoring)

---

## Key Takeaway

**This is a SOLVED PROBLEM with battle-tested solutions.** The architecture is proven, libraries are mature, and implementation is straightforward. The minimal example (50 lines) provides 100% local terminal behavior.

**No need to reinvent the wheel** - follow VS Code's approach with xterm.js + node-pty + WebSockets.

---

## References

- [Xterm.js Official Documentation](https://xtermjs.org/)
- [Xterm.js Flow Control Guide](https://xtermjs.org/docs/guides/flowcontrol/)
- [Microsoft node-pty GitHub](https://github.com/microsoft/node-pty)
- [VS Code Terminal Advanced](https://code.visualstudio.com/docs/terminal/advanced)
- [Wetty - Terminal in browser](https://github.com/butlerx/wetty)
- [ttyd - Share terminal over web](https://github.com/tsl0922/ttyd)
