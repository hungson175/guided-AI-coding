# Technical Spec: Live Terminal MVP

**Date:** 2026-02-09
**Author:** TL
**Location:** experiments/live-terminal/ (isolated from main codebase)
**Research:** See RESEARCH_FINDINGS.md

---

## Overview

Create TRUE live terminal in browser - 100% identical to local terminal behavior using proven xterm.js + node-pty + WebSocket architecture.

**Goal:** User types in browser, sees real shell with autocomplete, colors, Ctrl+C, all native terminal features.

---

## Architecture

```
Browser (xterm.js)  ←→  WebSocket  ←→  Node.js (node-pty)  ←→  Shell PTY
```

**Frontend:** Single HTML page with xterm.js terminal emulator
**Backend:** Node.js service on port 17071 (existing terminal service)
**Transport:** Socket.io WebSocket for bidirectional streaming

---

## Frontend Tasks (FE)

### Files to Create
- `experiments/live-terminal/public/index.html` - Terminal UI page

### Core Requirements

1. **xterm.js Integration**
   - Initialize terminal with cursor blink, 80x30 default size
   - Load FitAddon for auto-resize
   - Mount to DOM element

2. **Socket.io Client**
   - Connect to `ws://localhost:17071`
   - Handle connection/disconnection states
   - Show connection status indicator

3. **Event Handling**
   - User input → emit to backend via WebSocket
   - Backend output → write to terminal display
   - Window resize → fit terminal and notify backend

4. **Visual Polish**
   - Full viewport terminal (100vh height)
   - Dark theme background (#000)
   - Connection status badge (top-right corner)

### Dependencies
```json
{
  "xterm": "^5.3.0",
  "xterm-addon-fit": "^0.8.0",
  "socket.io-client": "^4.6.0"
}
```

---

## Backend Tasks (BE)

### Files to Modify
- `backend/terminal_service/server.js` (or create if doesn't exist)

### Core Requirements

1. **Socket.io Server Setup**
   - Listen on port 17071 (existing terminal service port)
   - CORS: allow localhost:3334 (our frontend)
   - Serve static files from `experiments/live-terminal/public/`

2. **PTY Process Management**
   - Spawn shell PTY on client connection (bash/powershell)
   - Environment: HOME directory, inherit process.env
   - Terminal: xterm-256color, 80x30 default

3. **WebSocket Event Handlers**
   - `data` (from client) → write to PTY stdin
   - PTY stdout → emit `data` to client
   - `resize` → call ptyProcess.resize(cols, rows)
   - `disconnect` → kill PTY, cleanup session

4. **Flow Control** (CRITICAL)
   - Implement watermark-based throttling
   - HIGH=100000, LOW=10000 byte thresholds
   - Prevent UI freeze on large outputs (test with `yes`)

5. **Session Management**
   - Map socket.id to PTY process
   - Cleanup on disconnect
   - One PTY per WebSocket connection

### Dependencies
```json
{
  "express": "^4.18.0",
  "socket.io": "^4.6.0",
  "node-pty": "^1.1.0"
}
```

---

## WebSocket API Contract

### Events: Client → Server

**`data`** - User keystroke
```javascript
socket.emit('data', '\r');  // User pressed Enter
```

**`resize`** - Terminal resized
```javascript
socket.emit('resize', { cols: 120, rows: 40 });
```

### Events: Server → Client

**`data`** - Shell output
```javascript
socket.emit('data', 'user@host:~$ ');  // Shell prompt
```

---

## Test Cases (TDD)

### Frontend Tests
1. Terminal mounts to DOM on page load
2. User input emits `data` event to WebSocket
3. Backend `data` event writes to terminal display
4. Window resize triggers fit + emits resize event
5. Connection status badge shows "Connected" when socket connected

### Backend Tests
1. Socket connection spawns PTY process
2. PTY output emits to WebSocket client
3. Client `data` event writes to PTY stdin
4. Resize event calls ptyProcess.resize()
5. Disconnect kills PTY and cleans up session
6. Flow control pauses/resumes PTY at thresholds
7. Multiple clients get separate PTY sessions

### Integration Tests
1. Type `pwd` → see current directory
2. Tab autocomplete works (type `cd Doc[TAB]`)
3. Ctrl+C kills running process
4. Colors work (`ls --color`)
5. Large output doesn't freeze UI (`yes` then Ctrl+C)

---

## Code Coverage Requirements

**Frontend:** 70% minimum coverage
- Event handlers: 80%+
- Socket.io integration: 75%+
- UI components: 65%+

**Backend:** 80% minimum coverage
- PTY lifecycle: 90%+
- WebSocket handlers: 85%+
- Flow control: 90%+

---

## Acceptance Criteria

**Must Have:**
- ✅ Browser terminal looks identical to local terminal
- ✅ Tab autocomplete works
- ✅ Ctrl+C, Ctrl+D, arrow keys work
- ✅ Colors display correctly
- ✅ Large outputs don't freeze terminal (flow control)
- ✅ Tests pass with coverage targets met

**Nice to Have (Future):**
- Session persistence across page reloads
- Multiple terminal tabs
- Terminal search (Ctrl+F)
- Clickable URLs

---

## Implementation Notes

**Keep it simple** - This is MVP in experiments/ folder, not production feature.

**Reference minimal example** - See RESEARCH_FINDINGS.md for 50-line working implementation.

**Test thoroughly** - Run `yes`, `cat large-file`, tab completion to verify true PTY behavior.

**Security is secondary** - No authentication needed for local MVP. Production hardening comes later.

---

## Timeline Estimate

**Frontend:** 2-3 hours (single HTML page)
**Backend:** 3-4 hours (PTY + flow control)
**Integration testing:** 1-2 hours

**Total:** 6-9 hours for complete MVP
