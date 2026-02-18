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
bash scripts/prod.sh             # Prod mode (tunnels disabled — use Tailscale or local only)
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
  app/api/chat.py            POST /api/chat — tutor agent (Grok LLM)
  app/services/tutor_agent.py Power Agent pattern + ReadTerminal tool
  app/services/              Business logic
  app/templates/             HTML templates (tic_tac_toe.py)
frontend/                   Next.js 16 + React 19 + Tailwind + shadcn/ui
  app/page.tsx               Root page — two-panel layout
  components/                left-panel, right-panel, interactive-terminal + shadcn/ui
  lib/api.ts                 API client (sendChatMessage, sendTerminalCommand, readTerminalOutput)
  hooks/                     use-mobile, use-toast
docs/kickoff/                PRD + frontend spec
```

**Current state:** V3 — live terminal + LLM tutor (Grok via xAI) with terminal awareness.

## Product Direction & Roadmap
Two Claude Code instances: left = user's workspace, right = tutor. See [lt-memory/product-vision.md](lt-memory/product-vision.md) for full vision, roadmap, and backlog.

## Workflow Rules
- **Commit before new sprint:** Always commit all changes from the current sprint before starting the next one. This ensures clean revert points via Git.
- **Branch when risky:** Consider creating a new branch for large/risky sprints so the main branch stays safe.

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
5. Chat `$ cmd` → detect prefix → POST /api/terminals/default/send → wait 5s → GET /api/terminals/default/read → display output in chat

## Pitfalls
Read [lt-memory/pitfalls.md](lt-memory/pitfalls.md) before modifying tricky areas.

## Long-Term Memory
`lt-memory/` uses progressive disclosure — this file stays short with summaries, detail files are read on-demand:
- `pitfalls.md` — Known gotchas and things that break unexpectedly
- `architecture.md` — Detailed component interactions, mock system design, and iframe sandbox details
- `product-vision.md` — Multi-agent architecture vision, roadmap, and backlog
