# CLAUDE.md

## Commands
```bash
# 1. Start the tmux session (STUDENT bash + TUTOR Claude Code)
bash scripts/setup-tutor.sh

# 2. Start all 3 web services
bash scripts/dev.sh

# 3. Open browser → http://localhost:3343

# Communication (from outside tmux)
tm-send -s guided_ai_coding TUTOR "your message"
tm-send -s guided_ai_coding STUDENT "your message"
```

## Architecture
**AI Software Advisor** — Web UI + tmux backend. Student uses browser, tutor runs as Claude Code in tmux.

```
┌─────────────────────────────────┬──────────────────────────────┐
│  LEFT PANEL (70%)               │  RIGHT PANEL (30%)            │
│  Interactive Terminal            │  Tutor Output + Chat Input    │
│                                 │                               │
│  xterm.js ↔ Socket.io           │  TUTOR pane output (streamed) │
│  ↕                              │  + Message input box           │
│  terminal-service (node-pty)    │  ↕                             │
│  ↕                              │  Backend (FastAPI)             │
│  tmux attach → STUDENT pane     │  ↕                             │
│  (zoomed, status bar off)       │  tmux capture-pane / send-keys │
│                                 │  → TUTOR pane                  │
└─────────────────────────────────┴──────────────────────────────┘

tmux session: guided_ai_coding
  Pane 0 (STUDENT): bash shell — student's workspace (via web terminal)
  Pane 1 (TUTOR):   Claude Code with tutor prompt
```

### Services
| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3343 | Web UI with left/right panels |
| Backend (FastAPI) | 17066 | Chat API + TUTOR pane WebSocket |
| Terminal Service (Node.js) | 17076 | xterm.js ↔ tmux STUDENT pane |

### Key Files
```
scripts/setup-tutor.sh              Tmux session setup (bash + Claude Code)
scripts/dev.sh                      Start all 3 services
prompts/TUTOR_PROMPT.md             Tutor role prompt (tutor persona)
frontend/                           Next.js web UI
backend/                            FastAPI (chat API + tutor WS)
backend/app/services/tmux_service.py  Tmux capture-pane/send-keys wrapper
backend/app/api/tutor_ws.py         WebSocket streaming TUTOR pane output
terminal-service/                   Node.js terminal sidecar (tmux attach)
tutor/memory/                       Tutor's persistent memory
lt-memory/                          Long-term architecture memory
docs/voice_input_ref/               Voice input pipeline reference (Soniox STT + Grok LLM correction) from AI-teams-controller
frontend/lib/ansi-parser.ts         ANSI-to-HTML converter (right panel colors)
frontend/hooks/useVoiceInput.ts     Soniox STT + Grok correction hook
backend/app/api/voice.py            POST /api/voice/correct — transcript correction via Grok
```

## Product Direction & Roadmap
Two Claude Code instances: left = user's workspace, right = tutor. See [lt-memory/product-vision.md](lt-memory/product-vision.md) for full vision, roadmap, and backlog.

## Workflow Rules
- **Commit before new sprint:** Always commit all changes from the current sprint before starting the next one. This ensures clean revert points via Git.
- **Branch when risky:** Consider creating a new branch for large/risky sprints so the main branch stays safe.

## How It Works
- **Left panel**: Student's terminal. Just a bash shell. Knows nothing about the right panel.
- **Right panel**: Continuously captures and displays the TUTOR tmux pane. Has an input box to send messages to the tutor.
- **Tutor**: Claude Code instance that can peek at the student's terminal when needed. Never sends anything to it.

## Pitfalls
Read [lt-memory/pitfalls.md](lt-memory/pitfalls.md) before modifying tricky areas.

## Long-Term Memory
`lt-memory/` uses progressive disclosure — this file stays short with summaries, detail files are read on-demand:
- `pitfalls.md` — Known gotchas and things that break unexpectedly
- `architecture.md` — Tmux team setup, communication patterns, pane architecture
- `product-vision.md` — Multi-agent architecture vision, roadmap, and backlog
