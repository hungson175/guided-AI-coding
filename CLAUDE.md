# CLAUDE.md

## Commands
```bash
# First-time setup
tutor install

# Day-to-day usage
tutor start      # Start tmux + all services → http://localhost:3343
tutor stop       # Stop everything
tutor restart    # Stop + start (keeps tutor memory)
tutor reset      # Full reset (clears tutor memory, fresh start)
tutor update     # Pull from GitHub, reinstall deps
tutor status     # Check what's running

# Communication (from outside tmux)
tm-send -s guided_ai_coding TUTOR "your message"
tm-send -s guided_ai_coding STUDENT "your message"
```

## Architecture
**AI Software Advisor** — Web UI + tmux backend. Student uses browser, tutor runs as Claude Code in tmux.

```
┌─────────────────────────────────┬──────────────────────────────┐
│  LEFT PANEL (70%)               │  RIGHT PANEL (30%)            │
│  Interactive Terminal            │  Interactive Terminal          │
│                                 │  + Voice input (mic in header) │
│  xterm.js ↔ Socket.io           │  xterm.js ↔ Socket.io          │
│  ↕                              │  ↕                             │
│  terminal-service (node-pty)    │  terminal-service (node-pty)   │
│  ↕                              │  ↕                             │
│  tmux attach → guided_student   │  tmux attach → guided_tutor    │
│  (linked session, window 0)     │  (linked session, window 1)    │
└─────────────────────────────────┴──────────────────────────────┘

tmux sessions:
  guided_ai_coding (base): 2 windows
    Window 0 "STUDENT": bash shell — student's workspace
    Window 1 "TUTOR":   Claude Code with tutor prompt
  guided_student (linked → base, selects window 0)
  guided_tutor   (linked → base, selects window 1)
```

### Services
| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3343 | Web UI with left/right panels |
| Backend (FastAPI) | 17066 | Voice correction API + health check |
| Terminal Service (Node.js) | 17076 | xterm.js ↔ tmux (STUDENT + TUTOR) |

### Key Files
```
scripts/setup-tutor.sh              Tmux session setup (2 windows + linked sessions)
scripts/dev.sh                      Start all 3 services
prompts/TUTOR_PROMPT.md             Tutor role prompt (tutor persona)
frontend/                           Next.js web UI
frontend/components/interactive-terminal.tsx  Reusable xterm.js terminal (terminalName prop)
frontend/components/right-panel.tsx  Tutor terminal + voice input overlay
backend/                            FastAPI (voice API + health)
backend/app/services/tmux_service.py  Tmux session_exists check
terminal-service/                   Node.js terminal sidecar (tmux attach)
tutor/memory/                       Tutor's persistent memory
lt-memory/                          Long-term architecture memory
docs/voice_input_ref/               Voice input pipeline reference (Soniox STT + Grok LLM correction)
frontend/hooks/useVoiceInput.ts     Soniox STT + Grok correction hook
backend/app/api/voice.py            POST /api/voice/correct — transcript correction via Grok
```

## Product Direction & Roadmap
Two Claude Code instances: left = user's workspace, right = tutor. See [lt-memory/product-vision.md](lt-memory/product-vision.md) for full vision, roadmap, and backlog.

## Workflow Rules
- **Commit before new sprint:** Always commit all changes from the current sprint before starting the next one. This ensures clean revert points via Git.
- **Branch when risky:** Consider creating a new branch for large/risky sprints so the main branch stays safe.

## How It Works
- **Left panel**: Interactive terminal (xterm.js) connected to `guided_student` linked session → STUDENT window.
- **Right panel**: Interactive terminal (xterm.js) connected to `guided_tutor` linked session → TUTOR window. Has mic button for voice input.
- **Both panels** are full PTY terminals — arrow keys, Ctrl+C, menu selection, etc. all work.
- **Tutor**: Claude Code instance that can peek at the student's terminal when needed. Never sends anything to it.

## Pitfalls
Read [lt-memory/pitfalls.md](lt-memory/pitfalls.md) before modifying tricky areas.

## Long-Term Memory
`lt-memory/` uses progressive disclosure — this file stays short with summaries, detail files are read on-demand:
- `pitfalls.md` — Known gotchas and things that break unexpectedly
- `architecture.md` — Tmux team setup, communication patterns, pane architecture
- `product-vision.md` — Multi-agent architecture vision, roadmap, and backlog
