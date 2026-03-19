# Architecture Details

## Pure Tmux Architecture (no web app)

Student and tutor interact through a single tmux session with 2 panes side by side.

```
tmux session: guided_ai_coding
┌──────────────────────────────┬─────────────────────────┐
│  LEFT PANE (60%)             │  RIGHT PANE (40%)       │
│  STUDENT terminal            │  TUTOR (Claude Code)    │
│  bash shell                  │  Tutor prompt loaded    │
│  ~/tutor-workspace/          │  via /ecp               │
│  Student types commands here │  Observes student pane  │
└──────────────────────────────┴─────────────────────────┘
```

### Setup Flow

1. `tutor start` → `scripts/setup-tutor.sh`
2. Creates tmux session `guided_ai_coding` with 200x50 terminal
3. Left pane (0.0): bash shell in `tutor-workspace/`
4. Right pane (0.1): Claude Code with isolated config
5. Tutor prompt loaded via `/ecp prompts/.TUTOR_PROMPT_RESOLVED.md`
6. Prompt has pane IDs resolved (sed replacement at setup time)
7. Session start hook re-injects prompt after auto-compact

### Communication Patterns

**Student → Tutor**: Student types directly in right pane (or boss uses `tm-send`)
**Tutor observes student**: `tmux capture-pane -t <STUDENT_PANE_ID> -p -S -30`
**Tutor NEVER types into student pane**: Student types everything themselves

### Tutor Agent

**Prompt**: `prompts/TUTOR_PROMPT.md` (with `${STUDENT_PANE}`, `${TUTOR_PANE}`, `${PROJECT_ROOT}` placeholders)
**Resolved copy**: `tutor-workspace/prompts/.TUTOR_PROMPT_RESOLVED.md`

**Memory**: `tutor-workspace/memory/`
- `progress.md` — Where the student left off (read on every session start)
- `lessons-learned.md` — Teaching notes about the student

### Pane ID Injection
Setup script gets actual pane IDs after creating the session, then sed-replaces placeholders in the resolved prompt copy. The SessionStart hook re-reads this resolved file after compaction.

### Isolated Claude Config
Tutor uses `CLAUDE_CONFIG_DIR=$WORKSPACE/.claude-config` to avoid loading boss's global CLAUDE.md (which has SSH/MacBook stuff irrelevant to tutoring).
