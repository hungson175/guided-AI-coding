# Pitfalls

Known gotchas and non-obvious behaviors. Add entries as they are discovered.

## OAuth Tokens Are Config-Dir-Bound
`~/.claude/.credentials.json` tokens don't work when `CLAUDE_CONFIG_DIR` points elsewhere. The tutor's own credentials live at `tutor-workspace/.claude-config/.credentials.json`. If tutor can't authenticate, check this file exists.

## Pane IDs Change Every Session
Pane IDs (e.g., `%0`, `%3`) are assigned by tmux at session creation. The tutor prompt has placeholders (`${STUDENT_PANE}`) resolved at setup time. If the session is recreated, new IDs are generated and the prompt must be re-resolved.

## Session Start Hook Safety
The `session_start_tutor.py` hook only fires inside `guided_ai_coding` tmux session. If the session name changes, update the hook's safety check.

## Claude Code Startup Delay
Setup script sleeps 15s after launching Claude Code before sending `/ecp`. If Claude Code takes longer (slow machine), the prompt load may fail. Increase the sleep if needed.

## Tutor Reset Preserves Projects
`tutor reset` only clears `memory/` — student projects in `projects/` are preserved. This is intentional: reset the tutor's knowledge, not the student's work.
