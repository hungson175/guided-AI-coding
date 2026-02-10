# Architecture Details

## Component Hierarchy

```
RootLayout (app/layout.tsx)
  └── Page (app/page.tsx) — manages appContent state
        ├── LeftPanel (70%)
        │     ├── Terminal — mock bash, calls mockTerminalCommands()
        │     └── AppPreview — iframe, receives HTML string
        └── RightPanel (30%)
              └── Chat UI — keyword-matched advisor responses
```

## Mock Systems

### Terminal (`lib/mock-commands.ts`)
- Commands: help, mkdir, touch, cd, ls, run, scaffold, build, clear, version
- `run`, `npm start`, `scaffold` all return the same Tic-Tac-Toe HTML
- The Tic-Tac-Toe game is a 153-line HTML string embedded directly in the file
- Game: 3x3 grid, X/O turns, 8 winning conditions, reset button, purple gradient UI

### Advisor (`lib/advisor-responses.ts`)
- 20+ hardcoded responses keyed by substring match
- Match order: exact match -> partial substring match -> pattern match (what/how, play/game, etc.) -> default fallback
- No LLM — pure string matching

## Tech Stack Details
- **Next.js 16.1.6** with App Router
- **React 19** (client components only — all use `'use client'`)
- **Tailwind CSS 3.4** with CSS variables for theming (dark mode via class strategy)
- **shadcn/ui** — 49 components installed, only Button and Input actively used
- **Fonts**: Geist + Geist_Mono (loaded but assigned to unused vars with _ prefix)

## What Needs to Change for V2+
- Replace `getAdvisorResponse()` keyword matching with real LLM API call
- Replace `mockTerminalCommands()` with actual code execution or richer simulation
- The API route `/api/chat` is ready to be the integration point for a real backend
- AppPreview iframe can receive any HTML — V2/V3 just need different template strings
