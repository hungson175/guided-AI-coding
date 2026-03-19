# CLAUDE.md

## Commands
```bash
# First-time setup
tutor install

# Day-to-day usage
tutor start      # Start tmux session (student + tutor panes)
tutor stop       # Kill the session
tutor restart    # Stop + start (keeps tutor memory)
tutor reset      # Clear tutor memory (keeps student projects)
tutor update     # Pull from GitHub
tutor status     # Check if running

# Communication (from outside tmux)
tm-send -s guided_ai_coding TUTOR "your message"
```

## Architecture
**AI Coding Tutor** — Pure tmux, no web app. Student uses left pane, tutor (Claude Code) runs in right pane.

```
tmux session: guided_ai_coding
┌──────────────────────────────┬─────────────────────────┐
│  LEFT PANE (60%)             │  RIGHT PANE (40%)       │
│  STUDENT terminal            │  TUTOR (Claude Code)    │
│  bash shell                  │  Loads tutor prompt     │
│  ~/tutor-workspace/          │  Observes student via   │
│  Student types here          │  tmux capture-pane      │
└──────────────────────────────┴─────────────────────────┘
```

### Key Files
```
prompts/TUTOR_PROMPT.md          Tutor persona & teaching style
prompts/CURRICULUM.md            15-lesson curriculum (4 phases)
scripts/setup-tutor.sh           Creates tmux session with 2 panes
scripts/tutor.sh                 CLI manager (start/stop/restart/reset)
scripts/tutor-hooks/             Session-start hook (re-injects prompt after compact)
tutor-workspace/                 Student's workspace (bundled with project)
  memory/progress.md             Where student left off
  memory/lessons-learned.md      Student profile notes
  projects/                      Student's code projects
  prompts/                       Resolved prompts (generated at setup)
docs/research/                   Pedagogical framework & Claude Code feature inventory
lt-memory/                       Long-term architecture memory
```

## How It Works
- `tutor start` runs `setup-tutor.sh` which creates a tmux session with 2 panes
- Left pane: bash shell in `tutor-workspace/` — student types here
- Right pane: Claude Code with tutor prompt loaded via `/ecp`
- Tutor observes student's terminal via `tmux capture-pane`
- Tutor never types into student's pane — student does all typing
- Progress saved in `tutor-workspace/memory/progress.md`

## Teaching Methodology
- **Friction-first**: Student feels the problem before learning the solution
- **Just-in-time**: Never explain a concept before it's needed
- **Scaffold then fade**: Start hands-on, pull back as confidence grows
- **Every exercise builds the project**: No busywork

## Workflow Rules
- **Commit before new sprint:** Always commit before starting risky changes
- **Branch when risky:** Use branches for large/risky changes

## Long-Term Memory
`lt-memory/` — read on demand:
- `pitfalls.md` — Known gotchas
- `architecture.md` — Architecture details
- `product-vision.md` — Vision & roadmap
