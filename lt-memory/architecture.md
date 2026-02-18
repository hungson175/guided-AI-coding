# Architecture Details

## Component Hierarchy (V3)

```
RootLayout (app/layout.tsx)
  └── Page (app/page.tsx)
        ├── LeftPanel (70%)
        │     └── InteractiveTerminal — xterm.js + Socket.io → terminal-service (node-pty)
        └── RightPanel (30%)
              └── Chat UI → POST /api/chat → TutorAgent (Grok LLM + ReadTerminal tool)
```

## Mock Systems

### Terminal (`lib/mock-commands.ts`)
- Commands: help, mkdir, touch, cd, ls, run, scaffold, build, clear, version
- `run`, `npm start`, `scaffold` all return the same Tic-Tac-Toe HTML
- The Tic-Tac-Toe game is a 153-line HTML string embedded directly in the file
- Game: 3x3 grid, X/O turns, 8 winning conditions, reset button, purple gradient UI

### Advisor (`lib/advisor-responses.ts`)
- 20+ hardcoded responses keyed by substring match
- Match order: exact match -> partial substring match -> pattern match (what/how, play/game, etc.) -> default fallback
- No LLM — pure string matching

## Tech Stack Details
- **Next.js 16.1.6** with App Router
- **React 19** (client components only — all use `'use client'`)
- **Tailwind CSS 3.4** with CSS variables for theming (dark mode via class strategy)
- **shadcn/ui** — 49 components installed, only Button and Input actively used
- **Fonts**: Geist + Geist_Mono (loaded but assigned to unused vars with _ prefix)

## Chat ↔ Terminal Integration (Sprint 3)
- RightPanel detects `$ ` prefix in chat input → calls `sendTerminalCommand()` → waits 5s → calls `readTerminalOutput(5)` → strips ANSI → shows output as code block
- `TERMINAL_URL` in `lib/api.ts` uses `window.location.hostname:17076` for dynamic host resolution (works for both localhost and remote/tunneled access)
- Terminal-service REST endpoints: POST `/api/terminals/:name/send`, GET `/api/terminals/:name/read?lines=N`

## Tutor Agent (V3)
- `backend/app/services/tutor_agent.py` — Power Agent pattern (DO NOT modify system prompt or tool docstrings)
- Model: `grok-4-fast-non-reasoning` (xAI). API key from `~/dev/.env` via python-dotenv.
- System prompt: copied exactly from Power Agent Creator skill
- Specialization: `TUTOR_PROMPT.md` injected as a HumanMessage after system prompt
- Tool: `ReadTerminal` — calls terminal-service REST API, strips ANSI, returns clean text
- Singleton pattern: `get_tutor_agent()` returns a shared instance (conversation persists across requests within a process)
- Tutor prompt + student progress loaded from `tutor/TUTOR_PROMPT.md` + `tutor/memory/progress.md`

## What Needs to Change for V4+
- Add `SendTerminal` tool so tutor can demo commands in the left panel
- Add memory write tool so tutor can persist progress to `tutor/memory/`
- Consider streaming responses instead of waiting for full completion
- Reduce the 5s fixed wait for `$ ` prefix terminal output to something adaptive
