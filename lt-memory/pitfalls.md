# Pitfalls

Known gotchas and non-obvious behaviors. Add entries as they are discovered.

## Build Config
- `next.config.mjs` has `typescript.ignoreBuildErrors: true` — TypeScript errors won't block builds. Don't rely on `pnpm build` to catch type issues; run `tsc` separately.

## Linked Sessions + Race Condition
- **Orphaned linked sessions crash setup:** `setup-tutor.sh` runs with `set -e`. If `guided_student` or `guided_tutor` already exist from a partial run, `tmux new-session -d -s guided_student -t base` fails and aborts the whole script. Always kill linked sessions unconditionally before creating them.
- **Browser connects before tmux is ready:** `dev.sh` starts web services while `setup-tutor.sh` is still sleeping (15s for Claude Code). If browser connects, `exec tmux attach` fails → PTY dies permanently. `terminal-service/server.js` has a retry loop (30 attempts, 1s apart) to handle this. Don't remove it.
- **OAuth tokens are config-dir-bound:** `~/.claude/.credentials.json` tokens don't work when `CLAUDE_CONFIG_DIR` points elsewhere. The tutor's own credentials live at `~/tutor-workspace/.claude-config/.credentials.json`. `tutor reset` backs up and restores this file across the workspace wipe.

## Terminal Service CORS
- Socket.io has its own `cors: { origin: '*' }` in the `Server` constructor, but this does NOT apply to Express REST routes. If the frontend calls REST endpoints (e.g. `/api/terminals/default/send`), you must also add `app.use(cors())` to Express. These are two separate CORS mechanisms.

## Security — Never Expose Terminal on Public IP
- SSH reverse tunnels with `0.0.0.0` binding expose the terminal service to the entire internet. Anyone can execute commands on the machine. Vietnix tunnels for this project are **disabled** — do not re-enable without authentication.
- Use Tailscale (private P2P) or add auth middleware before exposing terminal-service remotely.

## API Keys
- API keys live in `~/dev/.env` (shared across projects). `dev.sh` auto-copies `XAI_API_KEY` → `backend/.env` and `SONIOX_API_KEY` → `frontend/.env.local` (as `NEXT_PUBLIC_SONIOX_API_KEY`) on each start.
- Backend uses `load_dotenv()` in `main.py` to load `.env` into `os.environ`. Voice endpoint reads `XAI_API_KEY` via `os.environ.get()`.

## xterm.js Listener Leaks
- `terminal.onData()` and `terminal.onResize()` return `IDisposable` objects. You MUST call `.dispose()` on cleanup, or listeners accumulate on reconnect (each keystroke fires N times). See `interactive-terminal.tsx` for the correct pattern.

## Bash Commands in JavaScript Strings
- When building bash `for` loops as JS strings, `do;` is a syntax error. Write as a single string: `for i in $(seq 1 30); do cmd; done` — NOT as an array joined with `'; '` which produces `do; cmd`.

## npm Install
- `npm install` in `frontend/` fails without `--legacy-peer-deps` due to peer dependency conflicts. Always use `npm install --legacy-peer-deps` when adding packages.

## Pydantic Settings + .env
- `backend/app/config.py` Settings has `"extra": "ignore"` in model_config. Without this, any env var in `.env` that's not a Settings field (e.g. `XAI_API_KEY`) causes a validation error at startup.
