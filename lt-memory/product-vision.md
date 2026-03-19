# Product Vision

## What This Is
A real product that teaches non-technical users (CEOs/business owners) to build software by working alongside an AI tutor. Pure tmux — no web app overhead.

## Architecture
Two tmux panes in one session:
- **Left pane (terminal):** Student's workspace — they type commands, run code, experiment
- **Right pane (tutor):** Claude Code instance prompted as an interactive tutor

The tutor observes the student's terminal via `tmux capture-pane` and guides them through a 15-lesson curriculum from "what is a terminal?" to building real projects with Claude Code.

## Teaching Method
- **Friction-first**: Student feels the problem before learning the solution
- **Just-in-time**: Never explain a concept before the student needs it
- **Scaffold then fade**: Start hands-on, pull back as confidence grows
- 15 lessons in 4 phases: basics → Claude Code power tools → independence → advanced

## Version History
- **V1-V4**: Web app versions (Next.js + FastAPI + terminal-service) — over-engineered
- **V5** (current): Pure tmux. Just prompts + scripts. No web dependencies.

## Why Tmux-Only
The web app added complexity (CORS, Socket.io, xterm.js, 3 services) for marginal benefit. The student needs a terminal — tmux IS a terminal. One script, two panes, done.
