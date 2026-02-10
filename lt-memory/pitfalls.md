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
