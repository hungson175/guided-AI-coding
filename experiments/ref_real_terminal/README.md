# Reference: Real Terminal (from command-center project)

Copied from `/home/hungson175/dev/coding-agents/AI-teams-controller/`.
Stack: Node.js (node-pty) + WebSocket + React (xterm.js).

## Structure

```
production/          ← Battle-tested code from command-center
  terminal-service/    server.js, auth.js, package.json (Node.js + node-pty + JWT)
  frontend/            InteractiveTerminal.tsx (React + xterm.js + socket.io)

prototype/           ← Simpler starting point (no auth, 185 lines)
  server.js            Minimal express + node-pty + ws
  TECH_SPEC.md         Technical design doc
  RESEARCH_FINDINGS.md node-pty vs alternatives

docs/                ← Sprint specs & architecture
  TECH_SPEC_LT1_backend.md   BE spec
  TECH_SPEC_LT2_frontend.md  FE spec
  TECH_SPEC_terminal_tab.md  Tab integration spec
  ARCHITECTURE.md             System architecture
```

## Key APIs (from prototype)

**Chatbot reads terminal:**
```
GET /api/terminals/:name/read?lines=50
```

**Chatbot sends commands:**
```
POST /api/terminals/:name/send  { "data": "ls -la\n" }
```

**User interacts via WebSocket** (xterm.js in browser).
