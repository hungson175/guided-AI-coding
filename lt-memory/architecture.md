# Architecture Details

## Tmux Team Setup

```
tmux session: guided_ai_coding
┌─────────────────────────────────┬──────────────────────┐
│  Pane 0 — STUDENT (70%)        │  Pane 1 — TUTOR (30%) │
│  Regular Claude Code            │  Claude Code + prompt  │
│  Student's workspace            │  Coach Son persona     │
└─────────────────────────────────┴──────────────────────┘
```

### Setup Script: `scripts/setup-tutor.sh`
1. Creates tmux session `guided_ai_coding`
2. Splits 70/30 horizontal
3. Sets `@role_name` on each pane (STUDENT, TUTOR) for tm-send
4. Starts Claude Code in both panes
5. Waits 15s for startup
6. Creates resolved tutor prompt with actual pane IDs (`prompts/.TUTOR_PROMPT_RESOLVED.md`)
7. Sends `/ecp prompts/.TUTOR_PROMPT_RESOLVED.md` to tutor pane

### Pane ID Injection
The tutor prompt (`prompts/TUTOR_PROMPT.md`) uses placeholders:
- `${STUDENT_PANE}` — replaced with actual tmux pane ID (e.g., `%5`)
- `${TUTOR_PANE}` — replaced with actual tmux pane ID (e.g., `%6`)
- `${PROJECT_ROOT}` — replaced with absolute project path

The setup script creates `.TUTOR_PROMPT_RESOLVED.md` with these replaced, then loads it via `/ecp`.

## Communication Patterns

### tm-send (Inter-pane messaging)
```bash
# Student sends to Tutor
tm-send TUTOR "I'm done with the task"

# Tutor sends to Student
tm-send STUDENT "Try running ls to see your files"

# From outside tmux
tm-send -s guided_ai_coding TUTOR "message"
```

tm-send uses `@role_name` pane options to find the target pane. `PANE_ROLES.md` in `docs/tmux/guided_ai_coding/` enables auto-detection.

### Tutor Observation (capture-pane)
```bash
# Tutor reads student's terminal (last 30 lines)
tmux capture-pane -t <STUDENT_PANE_ID> -p -S -30

# More context (last 50 lines)
tmux capture-pane -t <STUDENT_PANE_ID> -p -S -50
```

The tutor uses this to verify student's work (verification protocol) and observe progress.

## Tutor Agent

### Prompt: `prompts/TUTOR_PROMPT.md`
- Persona: Coach Son — Vietnamese-speaking coding tutor
- Student: Anh Tuong — CEO with zero programming experience
- Teaching: Progressive lessons (terminal basics → Claude Code → building projects)
- Verification: Reads student's pane output to check work

### Memory: `tutor/memory/`
- `progress.md` — Where the student left off (lesson, step, what's next)
- `lessons-learned.md` — Teaching notes (what works, what doesn't)
- Tutor reads `progress.md` on every session start to resume correctly

## Retired Components (V1-V3 Web App)
The following are no longer active but remain in the repo:
- `frontend/` — Next.js 16 + React 19 + xterm.js (two-panel web UI)
- `backend/` — FastAPI + Grok LLM tutor agent + ReadTerminal tool
- `terminal-service/` — Node.js + node-pty + Socket.io (terminal sidecar)
- `scripts/dev.sh`, `scripts/prod.sh` — Web app startup scripts
