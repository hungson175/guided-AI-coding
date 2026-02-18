# Product Vision

## What This Is
NOT a demo. A real product being progressively built. Teaches non-technical users (CEOs/business owners) to build software by working alongside an AI tutor.

## Multi-Agent Architecture (Target)
Two Claude Code instances in the same UI:
- **Left panel (terminal):** Claude Code instance for the user — a workspace to code, experiment, and learn.
- **Right panel (tutor):** Claude Code instance prompted as an interactive tutor. Teaching method injected via system prompt.

The tutor (right) must be **aware of the left panel's state** — it needs to:
1. Send commands/messages to the left terminal
2. Read output/state from the left terminal
3. React to what the user does in the left terminal

This is essentially a multi-agent system where both panels have IDs/positions and can communicate bidirectionally.

### Implementation Approach
- Create a **skill** for the right-panel Claude Code (e.g. "work with interactive environment") that gives it tools to send/read from the left terminal
- Communication via the terminal-service REST API (POST /send, GET /read) already exists
- The skill would wrap these APIs so the tutor agent can naturally interact with the user's workspace

## Version Roadmap
- **V1** (done): Build Tic-Tac-Toe in <15 min via mock terminal + advisor
- **V2** (done): Live terminal (xterm.js + node-pty) + chat-terminal integration
- **V3** (done): LLM tutor agent (Grok via xAI) with ReadTerminal tool, replaces keyword matching
- **V4**: Load CSV, show charts — real data dashboard
- **V5** (optional): Multi-page apps, routing, template gallery

## Backlog
- **Memory system for advisor:** Text-based, progressive disclosure. Simple — no complex types. Lets the advisor remember user progress, decisions, and context across sessions.
- **Tutor skill for terminal interaction:** Skill that lets the right-panel Claude Code send/read from the left terminal programmatically.
- **Panel awareness:** Both panels need IDs and a protocol for discovering each other's state.
