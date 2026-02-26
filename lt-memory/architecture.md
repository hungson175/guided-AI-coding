# Architecture Details

## Hybrid Architecture: Web UI + Tmux Backend

The student interacts via a **web browser**. The underlying engine is a **tmux session** with 2 windows + linked sessions for independent terminal viewing.

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

### Why Linked Sessions (Not Panes)

The old design used 2 panes in 1 window with STUDENT zoomed. All `tmux attach` clients saw the same zoomed pane — no way to view TUTOR independently. Linked sessions solve this: each linked session shares the same windows but can independently select which window to display.

### Three Services

| Service | Port | Role |
|---------|------|------|
| **Frontend** (Next.js) | 3343 | Web UI — left + right interactive terminals |
| **Backend** (FastAPI) | 17066 | POST /api/voice/correct (Grok STT correction), health check |
| **Terminal Service** (Node.js) | 17076 | xterm.js ↔ tmux via node-pty + Socket.io (both STUDENT and TUTOR) |

### Setup Flow

1. `bash scripts/setup-tutor.sh` — Creates tmux session with 2 windows + linked sessions
   - Window 0 STUDENT: plain bash in `~/tutor-workspace`
   - Window 1 TUTOR: Claude Code with tutor prompt via `/ecp`
   - `guided_student` linked session → window 0
   - `guided_tutor` linked session → window 1
2. `bash scripts/dev.sh` — Starts frontend + backend + terminal-service
3. Student opens `http://localhost:3343` in browser

### How terminal-service works
- `createTerminal(name)` spawns a bare bash shell, waits for first `resize` from browser
- `attachTmux(session, termName)` picks the linked session based on `termName`:
  - `"default"` → `tmux attach -t guided_student`
  - `"tutor"` → `tmux attach -t guided_tutor`
- Has a retry loop (30 attempts, 1s) to wait for linked sessions to exist before attaching
- Each browser tab gets its own PTY → tmux client

### How right panel works (post-refactor)
- Right panel is `<InteractiveTerminal terminalName="tutor" />` — identical to left panel but targeting different linked session
- Full keyboard support: arrow keys, Ctrl+C, menu selection, Escape — all work
- Voice input: mic button in header → Soniox STT → Grok correction → `socket.emit('data', text)` types directly into terminal
- No more polling, capture-pane, or send-keys for the right panel

## Communication Patterns

### Student → Tutor (via right panel terminal)
Student types directly into the tutor's Claude Code terminal. Full interactive input.

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

### Memory: `tutor/memory/` (lives in `~/tutor-workspace/memory/`)
- `progress.md` — Where the student left off
- `lessons-learned.md` — Teaching notes
- Tutor reads `progress.md` on every session start

## Pane ID Injection
The tutor prompt uses placeholders (`${STUDENT_PANE}`, `${TUTOR_PANE}`, `${PROJECT_ROOT}`) replaced at setup time. The resolved copy is `~/tutor-workspace/prompts/.TUTOR_PROMPT_RESOLVED.md`.
