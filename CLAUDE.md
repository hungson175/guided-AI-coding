# CLAUDE.md

## Commands
```bash
# Backend (FastAPI)
cd backend && uv sync                                    # Install deps
cd backend && uv run uvicorn app.main:app --port 17066 --reload  # Dev server

# Terminal Service (Node.js)
cd terminal-service && npm install                       # Install deps
cd terminal-service && node server.js                    # Dev server (port 17076)

# Frontend (Next.js)
cd frontend && pnpm dev          # Start dev server
cd frontend && pnpm build        # Production build
cd frontend && pnpm lint         # ESLint

# All three at once
bash scripts/dev.sh              # Local dev (backend + terminal + frontend)
bash scripts/prod.sh             # Prod mode with Vietnix tunnels
```
Package managers: **pnpm** (frontend), **uv** (backend), **npm** (terminal-service).

## Architecture
**AI Software Advisor** — a learning product that teaches non-technical users (CEOs/business owners) to build software by talking to an AI advisor.

Two-panel layout: Left (70%) = live xterm.js terminal, Right (30%) = AI advisor chatbot.

```
terminal-service/           Node.js sidecar (port 17076)
  package.json              express, socket.io, node-pty
  server.js                 Express + Socket.io + node-pty → spawns bash PTY
backend/                    Python FastAPI (port 17066)
  app/main.py               FastAPI app, CORS, /health
  app/config.py             Settings (port, CORS origins from .env)
  app/api/commands.py        POST /api/commands — terminal command execution (dormant)
  app/api/chat.py            POST /api/chat — advisor chatbot
  app/services/              Business logic (mock_commands, advisor_responses)
  app/templates/             HTML templates (tic_tac_toe.py)
frontend/                   Next.js 16 + React 19 + Tailwind + shadcn/ui
  app/page.tsx               Root page — two-panel layout
  components/                left-panel, right-panel, interactive-terminal + shadcn/ui
  lib/api.ts                 API client (sendChatMessage)
  hooks/                     use-mobile, use-toast
docs/kickoff/                PRD + frontend spec
```

**Current state:** V2 — live terminal via xterm.js + node-pty, advisor chatbot via FastAPI.

## Version Roadmap
- **V1** (done): Build Tic-Tac-Toe in <15 min via mock terminal + advisor
- **V2** (current): Live terminal (xterm.js + node-pty) replaces mock terminal
- **V3**: Load CSV, show charts — real data dashboard
- **V4** (optional): Multi-page apps, routing, template gallery

## Key Conventions
- All components use `'use client'` directive (client-side rendering)
- Props interfaces defined inline above component
- shadcn/ui for UI primitives (`@/components/ui/`)
- Path alias: `@/` maps to project root
- CSS: Tailwind with CSS variables for theming (`hsl(var(--background))`)
- `cn()` utility from `lib/utils.ts` for class merging

## Data Flow
1. User types in xterm.js terminal → Socket.io `data` event → terminal-service (node-pty) → bash PTY
2. PTY output → Socket.io `data` event → xterm.js renders in browser
3. User chats in RightPanel → `sendChatMessage()` (POST /api/chat) → FastAPI advisor reply
4. Flow control: client sends `ack` events, server pauses PTY if watermark > 100KB

## Pitfalls
Read [lt-memory/pitfalls.md](lt-memory/pitfalls.md) before modifying tricky areas.

## Long-Term Memory
`lt-memory/` uses progressive disclosure — this file stays short with summaries, detail files are read on-demand:
- `pitfalls.md` — Known gotchas and things that break unexpectedly
- `architecture.md` — Detailed component interactions, mock system design, and iframe sandbox details
