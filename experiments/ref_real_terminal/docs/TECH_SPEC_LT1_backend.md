# Technical Spec: Sprint LT-1 - Backend Integration

**Author:** TL | **Date:** 2026-02-09 | **Owner:** BE

---

## Overview

Migrate MVP (`experiments/live-terminal/server.js`) to `terminal-service/`, add JWT auth, CORS, and replace old service on port 17071.

## Source Material

- **MVP code:** `experiments/live-terminal/server.js` (working, tested)
- **Current frontend:** `frontend/components/terminal/InteractiveTerminal.tsx` (uses raw WebSocket)
- **Auth service:** `backend/app/services/auth_service.py` (JWT HS256)
- **Config:** `backend/.env` (JWT_SECRET_KEY, API_TOKEN)

---

## Architecture

```
terminal-service/
├── server.js        # Express + Socket.io + REST API (from MVP)
├── auth.js          # JWT verification middleware
├── package.json     # Dependencies
└── .env             # → symlink or reads from backend/.env
```

---

## Key Changes from MVP

### 1. Auth Middleware (`auth.js`)

Verify tokens using **same JWT_SECRET_KEY** as FastAPI backend (HS256).

**Dual auth support:**
- **JWT token** - Decode with `jsonwebtoken` library, verify `type: "access"` and not expired
- **Static API_TOKEN** - Direct string comparison for programmatic access

**Apply to:**
- REST endpoints: `Authorization: Bearer <token>` header
- WebSocket: `token` query param on handshake (`io({ query: { token } })`)

**Environment vars to read:**
- `JWT_SECRET_KEY` (from backend/.env)
- `API_TOKEN` (from backend/.env)

### 2. CORS Configuration

```javascript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  || 'http://localhost:3334,https://voice-ui.hungson175.com';
```

Apply to both Express CORS and Socket.io `cors.origin`.

### 3. Port Change

`PORT = 17071` (replace old terminal service)

### 4. Health Check Endpoint

```
GET /health → { "status": "ok", "terminals": <count>, "uptime": <seconds> }
```

### 5. Backward Compatibility (CRITICAL)

Current frontend uses **raw WebSocket** with this protocol:
- Connect: `ws://host:17071/terminal?token=...`
- Resize: `JSON.stringify({ type: "resize", cols, rows })`
- Input: raw text
- Output: raw text

**BE must support BOTH protocols simultaneously** until FE migrates in LT-2:
- **`/terminal` path** → raw WebSocket (legacy, for current FE)
- **Socket.io default path** → Socket.io (new, for LT-2 FE)

---

## REST API (unchanged from MVP)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/terminals` | GET | Yes | List sessions |
| `/api/terminals/:name/send` | POST | Yes | Send to terminal |
| `/api/terminals/:name/read` | GET | Yes | Read output |
| `/api/terminals/:name/clear` | POST | Yes | Clear buffer |
| `/api/terminals/:name/resize` | POST | Yes | Resize terminal |

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.6.0",
    "node-pty": "^1.1.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.0",
    "ws": "^8.16.0"
  }
}
```

`ws` needed for legacy raw WebSocket support alongside Socket.io.

---

## Test Cases (TDD)

### Auth Tests
1. Valid JWT → 200 / connection accepted
2. Expired JWT → 401 / connection rejected
3. Invalid JWT → 401 / connection rejected
4. Valid API_TOKEN → 200 / connection accepted
5. No token → 401 / connection rejected

### REST API Tests
1. `GET /health` → 200 (no auth required)
2. `POST /api/terminals/:name/send` with valid token → command executes
3. `GET /api/terminals/:name/read` → returns output buffer
4. Unauthenticated request → 401

### WebSocket Tests
1. Socket.io connection with valid JWT → connects, gets PTY
2. Legacy WebSocket `/terminal?token=...` → connects, gets PTY
3. Input through socket → appears in PTY output
4. PTY output → forwarded to client
5. Resize event → PTY resized
6. Disconnect → session persists (no PTY kill)

### Integration Tests
1. Send `echo test` via REST → read output contains "test"
2. Browser connects via Socket.io → full terminal works
3. Legacy WebSocket → same terminal behavior

---

## Code Coverage Requirements

**Backend:** 80% minimum
- Auth middleware: 90%+
- REST endpoints: 85%+
- WebSocket handlers: 80%+
- PTY lifecycle: 85%+

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `terminal-service/server.js` | Create (migrate from MVP + add auth/CORS/health) |
| `terminal-service/auth.js` | Create (JWT + API_TOKEN verification) |
| `terminal-service/package.json` | Create |
| `terminal-service/.env` | Create (or symlink to backend/.env) |
| `terminal-service/tests/` | Create (test files) |
| `scripts/restart-terminal.sh` | Update for new service location |
