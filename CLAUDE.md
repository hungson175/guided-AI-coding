# CLAUDE.md

## Commands
```bash
# Start the tmux team (STUDENT + TUTOR)
bash scripts/setup-tutor.sh

# Attach to running session
tmux attach -t guided_ai_coding

# Communication (inside the session)
tm-send TUTOR "your message"       # Student → Tutor
tm-send STUDENT "your message"     # Tutor → Student

# Communication (from outside tmux)
tm-send -s guided_ai_coding TUTOR "your message"
tm-send -s guided_ai_coding STUDENT "your message"
```

## Architecture
**AI Software Advisor** — a learning product that teaches non-technical users (CEOs/business owners) to build software by working alongside an AI tutor.

Two-pane tmux layout: Left (70%) = student's Claude Code, Right (30%) = tutor Claude Code (Coach Son).

```
┌─────────────────────────────────┬──────────────────────┐
│  STUDENT (Claude Code)          │  TUTOR (Claude Code)  │
│  Pane 0 — 70% width            │  Pane 1 — 30% width   │
│                                 │                       │
│  - Regular Claude Code          │  - Claude Code with   │
│  - Student codes here           │    tutor prompt       │
│  - Runs commands                │  - Observes left pane │
│  - Builds projects              │  - Teaches via chat   │
│                                 │  - Uses tm-send       │
└─────────────────────────────────┴──────────────────────┘
         tmux session: guided_ai_coding
```

```
scripts/setup-tutor.sh         Tmux team setup (creates session, starts both Claude Code instances)
prompts/TUTOR_PROMPT.md        Tutor role prompt (Coach Son persona, teaching workflow)
tutor/memory/                  Tutor's persistent memory (progress.md, lessons-learned.md)
docs/tmux/guided_ai_coding/   PANE_ROLES.md for tm-send auto-detection
lt-memory/                     Long-term architecture memory
```

**Current state:** Tmux team with 2 Claude Code instances — student workspace + AI tutor (Coach Son).

### Retired (not deleted)
The following were part of the V1-V3 web app approach and are no longer active:
- `frontend/` — Next.js app
- `backend/` — FastAPI app
- `terminal-service/` — Node.js terminal sidecar
- `scripts/dev.sh`, `scripts/prod.sh` — Old web app startup scripts

## Product Direction & Roadmap
Two Claude Code instances: left = user's workspace, right = tutor. See [lt-memory/product-vision.md](lt-memory/product-vision.md) for full vision, roadmap, and backlog.

## Workflow Rules
- **Commit before new sprint:** Always commit all changes from the current sprint before starting the next one. This ensures clean revert points via Git.
- **Branch when risky:** Consider creating a new branch for large/risky sprints so the main branch stays safe.

## Communication Patterns
- **Student → Tutor**: `tm-send TUTOR "question or update"`
- **Tutor → Student**: `tm-send STUDENT "guidance or instruction"`
- **Tutor observes student**: `tmux capture-pane -t <student_pane_id> -p -S -30`

## Pitfalls
Read [lt-memory/pitfalls.md](lt-memory/pitfalls.md) before modifying tricky areas.

## Long-Term Memory
`lt-memory/` uses progressive disclosure — this file stays short with summaries, detail files are read on-demand:
- `pitfalls.md` — Known gotchas and things that break unexpectedly
- `architecture.md` — Tmux team setup, communication patterns, pane architecture
- `product-vision.md` — Multi-agent architecture vision, roadmap, and backlog
