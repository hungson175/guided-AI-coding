# Technical Spec: Sprint LT-2 - Frontend Integration

**Author:** TL | **Date:** 2026-02-09 | **Owner:** FE

---

## Overview

Replace raw WebSocket in `InteractiveTerminal.tsx` with Socket.io client. Add flow control, named sessions, connection status, and scrollback on reconnect.

## Source Material

- **Current FE:** `frontend/components/terminal/InteractiveTerminal.tsx` (raw WebSocket)
- **Parent component:** `frontend/components/controller/TmuxController.tsx` (lines 469-472)
- **Backend contract:** `terminal-service/server.js` (Socket.io + REST API)
- **Auth:** `frontend/lib/auth.ts` (`getToken()` returns JWT from localStorage)
- **Config:** `frontend/lib/config.ts` (`NETWORK.TERMINAL_PORT = 17071`)

---

## Architecture Change

```
BEFORE:  xterm.js → raw WebSocket → /terminal?token=...
AFTER:   xterm.js → Socket.io client → server (with flow control + named sessions)
```

---

## Changes Required

### 1. InteractiveTerminal.tsx - Replace WebSocket with Socket.io

**New dependency:** `socket.io-client` (add to frontend/package.json)

**Props interface change:**
```typescript
interface InteractiveTerminalProps {
  token: string
  isVisible: boolean
  terminalName?: string  // NEW: named session (default: "default")
}
```

**Connection logic:**
- Build Socket.io URL: dev → `http://localhost:17071`, prod → `NEXT_PUBLIC_TERMINAL_WS_URL`
- Connect with: `io(url, { query: { token, terminal: terminalName }, transports: ['websocket'] })`
- Events to handle:
  - `connect` → update status to connected, send initial resize
  - `disconnect` → update status to disconnected
  - `data` → write to xterm, track bytes for ACK
  - `exit` → show exit message
- Events to emit:
  - `data` → user keystrokes from `term.onData()`
  - `resize` → `{ cols, rows }` from `term.onResize()`
  - `ack` → bytes processed (flow control, see below)

### 2. Flow Control ACK

Track bytes received. When threshold exceeded, emit `ack` to unblock server PTY:

```typescript
const ACK_THRESHOLD = 50000
let bytesReceived = 0

socket.on('data', (data) => {
  term.write(data)
  bytesReceived += data.length
  if (bytesReceived >= ACK_THRESHOLD) {
    socket.emit('ack', bytesReceived)
    bytesReceived = 0
  }
})
```

### 3. Connection Status Indicator

Add a small status badge inside the terminal container (absolute positioned, top-right):
- **Connecting:** yellow badge, "Connecting..."
- **Connected:** green badge, auto-hide after 2s
- **Disconnected:** red badge, persistent until reconnect

Use `useState<'connecting' | 'connected' | 'disconnected'>('connecting')`

### 4. Scrollback on Reconnect

**No extra FE work needed.** Backend automatically sends `outputBuffer` on Socket.io connect. The `data` event handler already writes to xterm. Just ensure terminal is NOT cleared on reconnect (don't call `term.clear()` or dispose/recreate terminal on reconnect).

**Key pattern:** Create xterm ONCE on mount. Create Socket.io connection separately. On disconnect + reconnect, only recreate Socket.io connection, not xterm instance.

### 5. Auto-Reconnect

Socket.io has built-in reconnection. Keep defaults:
- `reconnection: true`
- `reconnectionDelay: 1000`
- `reconnectionDelayMax: 5000`

Update connection status on reconnect events.

---

## Files to Modify

| File | Action |
|------|--------|
| `frontend/components/terminal/InteractiveTerminal.tsx` | Rewrite: Socket.io + flow control + status |
| `frontend/package.json` | Add `socket.io-client` dependency |
| `frontend/lib/config.ts` | No changes needed (TERMINAL_PORT already 17071) |
| `frontend/components/controller/TmuxController.tsx` | No changes (props compatible) |

---

## Test Cases (TDD)

### Unit Tests (InteractiveTerminal.test.tsx)
1. Renders terminal container div
2. Connects Socket.io with token in query
3. Writes received `data` events to xterm
4. Emits `data` event on user keystroke
5. Emits `resize` event on terminal resize
6. Emits `ack` after receiving ACK_THRESHOLD bytes
7. Shows "Connected" status on socket connect
8. Shows "Disconnected" status on socket disconnect
9. Does NOT dispose xterm on socket disconnect (scrollback preserved)
10. Reconnects automatically after disconnect

### Integration Tests
1. Type command → see output (full round-trip)
2. Reconnect → scrollback history visible
3. Large output → no UI freeze (flow control working)

---

## Code Coverage Requirements

**Frontend:** 70% minimum
- Socket.io event handlers: 80%+
- Flow control logic: 85%+
- Connection status UI: 70%+
- Resize handling: 75%+

---

## Key Design Decisions

1. **Socket.io over raw WebSocket** - Built-in reconnection, multiplexing, flow control ACKs
2. **Separate xterm lifecycle from socket lifecycle** - Terminal persists across reconnects
3. **Named sessions via query param** - Future: multiple terminal tabs per team
4. **Status auto-hide** - Don't clutter UI when connection is stable
5. **Dynamic import preserved** - Keep `ssr: false` for xterm.js (no SSR support)
