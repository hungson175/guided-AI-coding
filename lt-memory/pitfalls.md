# Pitfalls

Known gotchas and non-obvious behaviors. Add entries as they are discovered.

## Build Config
- `next.config.mjs` has `typescript.ignoreBuildErrors: true` — TypeScript errors won't block builds. Don't rely on `pnpm build` to catch type issues; run `tsc` separately.

## API Route vs Client-Side
- `/api/chat/route.ts` exists and calls `getAdvisorResponse()`, but `RightPanel` also calls `getAdvisorResponse()` directly on the client. The API route is currently unused in the UI flow. If switching to a real LLM backend, update RightPanel to use the API route instead of the direct import.

## AppPreview Iframe
- `AppPreview` writes HTML directly into an iframe via `document.write()`. The iframe has `sandbox="allow-scripts allow-same-origin allow-popups"`. Changing sandbox permissions may break the Tic-Tac-Toe game's JavaScript execution.

## Terminal Mock
- `mockTerminalCommands()` lowercases input before matching — all command matching is case-insensitive. The `cd` command only recognizes "game" and "." as valid directories.

## Terminal Service CORS
- Socket.io has its own `cors: { origin: '*' }` in the `Server` constructor, but this does NOT apply to Express REST routes. If the frontend calls REST endpoints (e.g. `/api/terminals/default/send`), you must also add `app.use(cors())` to Express. These are two separate CORS mechanisms.

## Security — Never Expose Terminal on Public IP
- SSH reverse tunnels with `0.0.0.0` binding expose the terminal service to the entire internet. Anyone can execute commands on the machine. Vietnix tunnels for this project are **disabled** — do not re-enable without authentication.
- Use Tailscale (private P2P) or add auth middleware before exposing terminal-service remotely.

## API Keys
- API keys live in `~/dev/.env` (shared across projects). `dev.sh` auto-copies `XAI_API_KEY` → `backend/.env` and `SONIOX_API_KEY` → `frontend/.env.local` (as `NEXT_PUBLIC_SONIOX_API_KEY`) on each start.
- Backend uses `load_dotenv()` in `main.py` to load `.env` into `os.environ`. Voice endpoint reads `XAI_API_KEY` via `os.environ.get()`.

## Terminal Output ANSI Codes
- Right panel uses `ansi-to-html` to render colored Claude Code output. Do NOT strip ANSI codes — they carry color information. The old `stripAnsi()` approach was removed in Sprint 1.
- `ansi-to-html` is configured with `escapeXML: true` (XSS prevention) and renders via `dangerouslySetInnerHTML`.

## npm Install
- `npm install` in `frontend/` fails without `--legacy-peer-deps` due to peer dependency conflicts. Always use `npm install --legacy-peer-deps` when adding packages.

## Pydantic Settings + .env
- `backend/app/config.py` Settings has `"extra": "ignore"` in model_config. Without this, any env var in `.env` that's not a Settings field (e.g. `XAI_API_KEY`) causes a validation error at startup.
