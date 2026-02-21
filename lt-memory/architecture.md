# Architecture Details

## Hybrid Architecture: Web UI + Tmux Backend

The student interacts via a **web browser**. The underlying engine is a **tmux session** hosting both the student's shell and the tutor's Claude Code.

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
  Pane 0 (STUDENT): bash shell
  Pane 1 (TUTOR):   Claude Code with Coach Son prompt
```

### Three Services

| Service | Port | Role |
|---------|------|------|
| **Frontend** (Next.js) | 3343 | Web UI — left terminal + right tutor panel |
| **Backend** (FastAPI) | 17066 | POST /api/chat (send to tutor), WS /api/ws/tutor (stream tutor output) |
| **Terminal Service** (Node.js) | 17076 | xterm.js ↔ tmux STUDENT pane via node-pty + Socket.io |

### Setup Flow

1. `bash scripts/setup-tutor.sh` — Creates tmux session with 2 panes
   - STUDENT pane: plain bash, zoomed, status bar off
   - TUTOR pane: Claude Code with Coach Son prompt via `/ecp`
2. `bash scripts/dev.sh` — Starts frontend + backend + terminal-service
3. Student opens `http://localhost:3343` in browser

### How terminal-service works
- `createTerminal()` spawns `tmux attach-session -t guided_ai_coding` instead of standalone bash
- The STUDENT pane is zoomed, so tmux attach shows only that pane
- xterm.js in the browser becomes a tmux client — student sees only their bash shell

### How backend streams tutor output
- `WS /api/ws/tutor` polls `tmux capture-pane -t guided_ai_coding:0.1` every 0.5s
- Only sends when content changes (diff-based)
- Student messages sent via `POST /api/chat` → `tmux send-keys -t guided_ai_coding:0.1`

## Communication Patterns

### Student → Tutor (via web UI)
1. Student types message in right panel input
2. Frontend POSTs to `/api/chat`
3. Backend runs `tmux send-keys -t guided_ai_coding:0.1 "message" Enter`
4. Message appears as input in tutor's Claude Code
5. Tutor responds → captured by WebSocket → shown in right panel

### Tutor → Student (via tm-send)
```bash
tm-send STUDENT "Try running ls to see your files"
```

### Tutor Observation
```bash
tmux capture-pane -t <STUDENT_PANE_ID> -p -S -30
```

## Tutor Agent

### Prompt: `prompts/TUTOR_PROMPT.md`
- Persona: Coach Son — Vietnamese-speaking coding tutor
- Student: Anh Tuong — CEO with zero programming experience
- Teaching: Progressive lessons (terminal basics → Claude Code → building projects)
- Verification: Reads student's pane output to check work

### Memory: `tutor/memory/`
- `progress.md` — Where the student left off
- `lessons-learned.md` — Teaching notes
- Tutor reads `progress.md` on every session start

## Pane ID Injection
The tutor prompt uses placeholders (`${STUDENT_PANE}`, `${TUTOR_PANE}`, `${PROJECT_ROOT}`) replaced at setup time. The resolved copy is `prompts/.TUTOR_PROMPT_RESOLVED.md`.
