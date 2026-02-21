# Claude Code: Complete Feature Inventory for Non-Technical Curriculum Design

**Research Document — February 2026**
**Purpose:** Curriculum design for teaching Claude Code to smart adults with zero programming background

---

## How to Read This Document

Each feature entry contains:
- **What it does** — one-sentence plain-English description
- **Why a non-technical user would care** — the practical payoff
- **Difficulty** — Beginner / Intermediate / Advanced
- **Programming concepts required?** — Yes / No / Partial

---

## Category 1: Basic CLI Interaction

### 1.1 Starting Claude Code
Type `claude` in terminal, opens interactive conversation in plain English.
- **Difficulty:** Beginner
- **Variations:** `claude` (fresh), `claude -c` (continue last), `claude -r "name"` (resume named), `claude "question"` (start with a question)

### 1.2 The Conversation Loop (REPL)
Chat-style interaction — you type, it responds, you type more. Claude remembers everything said earlier in the conversation.
- **Difficulty:** Beginner

### 1.3 Verbose Toggle (Ctrl+O)
Shows/hides detailed steps Claude is taking (files read, commands run, exact outputs).
- **Difficulty:** Beginner

### 1.4 Bash Mode (! prefix)
Type `!` followed by a shell command to run it directly without Claude interpreting it.
- **Difficulty:** Intermediate (requires knowing shell commands)

### 1.5 Image/Screenshot Pasting (Ctrl+V)
Paste screenshots directly into Claude Code for analysis (error dialogs, UI mockups, design references).
- **Difficulty:** Beginner

---

## Category 2: Slash Commands (Built-in)

Type `/` to see all available commands.

### Essential Commands (Beginner)
| Command | What it does |
|---------|-------------|
| `/help` | Lists all available commands |
| `/init` | Scans project and creates CLAUDE.md with project instructions |
| `/clear` | Wipes conversation, starts fresh |
| `/rewind` | Undo Claude's recent edits (undo button for code) |
| `/exit` | Leave Claude Code |
| `/copy` | Copy last response to clipboard |
| `/rename <name>` | Name current session for easy finding later |
| `/cost` | Shows token usage |
| `/stats` | Usage history, streaks |
| `/status` | Version, model, account info |
| `/usage` | Subscription limits |
| `/doctor` | Health check of installation |
| `/todos` | List current TODO items |

### Intermediate Commands
| Command | What it does |
|---------|-------------|
| `/compact [instructions]` | Compresses conversation to free memory, with optional focus |
| `/context` | Visual grid of how full context window is |
| `/model` | Switch AI model (Sonnet=fast, Opus=powerful, Haiku=fastest) |
| `/permissions` | View/manage what Claude can do |
| `/plan` | Enter plan mode (Claude proposes, doesn't execute) |
| `/resume [session]` | Resume previous conversation |
| `/export [file]` | Save conversation to file |
| `/memory` | Edit CLAUDE.md memory files |
| `/theme` | Change color theme |
| `/statusline` | Configure status bar |
| `/terminal-setup` | Install keyboard shortcuts |
| `/mcp` | Manage MCP server connections |
| `/debug` | Read session debug log |
| `/add-dir` | Grant access to additional folders |
| `/config` | Open settings UI |
| `/tasks` | List background tasks |
| `/teleport` | Resume web session in terminal |
| `/desktop` | Hand off to desktop app |

### Advanced Commands
| Command | What it does |
|---------|-------------|
| `/hooks` | Interactive hook manager |
| `/agents` | Manage subagent configurations |
| `/vim` | Toggle Vim editing mode |

---

## Category 3: Skills (Custom Commands)

### What Skills Are
Reusable instruction files that extend Claude's capabilities. Write instructions once, invoke with `/skill-name`.

### Creating a Skill
Location: `~/.claude/skills/skill-name/SKILL.md` (personal) or `.claude/skills/skill-name/SKILL.md` (project)

Basic example (no frontmatter needed):
```
# security-review/SKILL.md
Review this code for security vulnerabilities...
```
Invoke with `/security-review`.

### Skill Frontmatter (Configuration)
| Field | What it does | Difficulty |
|-------|-------------|-----------|
| `name` | Custom slash command name | Beginner |
| `description` | When Claude should auto-invoke this skill | Intermediate |
| `argument-hint` | Autocomplete hint text | Beginner |
| `disable-model-invocation: true` | Only user can invoke, not Claude | Intermediate |
| `user-invocable: false` | Only Claude can auto-use, hidden from menu | Advanced |
| `allowed-tools` | Tools Claude can use without permission | Intermediate |
| `model` | Which AI model to use | Intermediate |
| `context: fork` | Run in isolated subagent | Advanced |

### Skill Arguments
Use `$ARGUMENTS` in skill content. `/fix-issue 123` passes "123" as `$ARGUMENTS`.
Multiple args: `$1`, `$2`, etc.

### @ File Reference Syntax
`@path/to/file.md` in prompts or CLAUDE.md tells Claude to read and include that file.

### Legacy: Custom Commands
Old location `.claude/commands/name.md` still works. Skills are the current approach with more features.

---

## Category 4: MCP (Model Context Protocol)

### What It Is
Open standard for connecting Claude to external tools/services. Like "plugins" that give Claude new capabilities.

### Popular MCP Servers
| Server | What Claude gets access to |
|--------|--------------------------|
| GitHub | Issues, PRs, code, repos |
| Playwright | Browser automation, screenshots, web testing |
| Context7 | Real-time library documentation |
| Notion | Pages and databases |
| PostgreSQL | Database queries in natural language |
| Slack | Messages, channels |
| Figma | Design files |
| Jira/Linear | Project management |

### Installing MCP Servers
```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp list     # See all configured servers
claude mcp remove   # Remove a server
```
Inside session: `/mcp` opens management interface with OAuth.

---

## Category 5: CLAUDE.md — Project Memory

### What It Is
Plain text file Claude reads automatically at session start. Like leaving a note explaining your project.

### Memory Locations (Priority Order)
| Type | Location | Scope |
|------|----------|-------|
| Project memory | `./CLAUDE.md` | Team (via git) |
| Project rules | `.claude/rules/*.md` | Team, topic-specific |
| User memory | `~/.claude/CLAUDE.md` | Personal, all projects |
| Local project | `./CLAUDE.local.md` | Personal, this project |
| Auto memory | `~/.claude/projects/.../memory/` | Claude's own notes |

### What to Put In
- Build/run/test commands
- Code style preferences
- Architecture notes (key folders, patterns)
- Things Claude should never do
- Links to docs via `@` imports

### Auto Memory
Claude automatically saves notes about your project. Tell Claude "remember that we use pnpm" and it saves it. Use `/memory` to view/edit.

---

## Category 6: Progressive Disclosure in CLAUDE.md

### The Pattern
Layer 1 (always loaded): Short CLAUDE.md with links to detail files
Layer 2 (on-demand): `.claude/rules/` files, loaded when working with matching files
Layer 3 (explicit): `@path` imports, only when referenced

### Good Structure Example
```
CLAUDE.md (50 lines max):
  - Project name, what it does
  - How to run (1-2 commands)
  - Key file locations
  - Links: @docs/architecture.md

.claude/rules/
  - testing.md
  - security.md
  - api.md (scoped to api/**/)

.claude/skills/
  - deploy/SKILL.md
  - pr-review/SKILL.md
```

---

## Category 7: Hooks — Lifecycle Automation

### What Hooks Are
Scripts that run automatically at specific points in Claude's lifecycle. Deterministic rules that always execute.

### Hook Events
| Event | When | Can block? | Use case |
|-------|------|-----------|----------|
| SessionStart | Session begins | No | Load context, setup |
| PreToolUse | Before any tool | Yes | Block dangerous commands |
| PostToolUse | After tool succeeds | No | Auto-lint, auto-test |
| Stop | When Claude finishes | Yes | Run tests before stopping |
| UserPromptSubmit | When you submit | Yes | Validate prompts |

### Hook Types
- **Command:** Run a shell script
- **Prompt:** Ask a small Claude model to evaluate
- **Agent:** Spawn a subagent to make decisions

### Configuration
`/hooks` interactive menu, or edit `.claude/settings.json` / `~/.claude/settings.json`

---

## Category 8: Built-in Tools

Tools Claude uses automatically — users don't invoke these directly.

| Tool | What it does |
|------|-------------|
| Read | Reads file content |
| Write | Creates/overwrites files |
| Edit | Targeted changes in existing files |
| Bash | Runs terminal commands |
| Glob | Finds files by pattern (`*.py`) |
| Grep | Searches file contents |
| WebFetch | Fetches URL content |
| WebSearch | Searches the web |
| Task | Spawns subagent for specialized work |

### Permission Tiers
- Read-only (Read, Grep, Glob): Always allowed
- Bash commands: Permission once per command
- File modification (Write, Edit): Permission per session

---

## Category 9: Extended Thinking

Claude reasons step-by-step before responding for complex problems.
- Toggle: `Alt+T` (after running `/terminal-setup`)
- In skills: Include word `ultrathink`
- Best for: Architecture decisions, complex debugging, security analysis

---

## Category 10: Permission Modes

| Mode | What happens |
|------|-------------|
| default | Prompts first time each action type |
| acceptEdits | File edits auto-approved |
| plan | Claude can analyze, cannot modify |
| bypassPermissions | All checks disabled (sandboxed environments only) |

Switch modes: `Shift+Tab` or `Alt+M`

---

## Category 11: Context Management

### Context Window
Fixed amount of working memory. Like a desk — once full, must remove to add.

### Monitoring
- `/context` — visual grid (green/yellow/red)
- `/cost` — token count

### Auto-Compact
At ~95% capacity, Claude auto-summarizes and continues. Sessions can run indefinitely.

### Manual
- `/compact [focus]` — compress with optional focus instruction
- `/clear` — wipe everything, start fresh

---

## Category 12: Git Integration

Claude understands git natively: read history, commit, branch, create PRs.
- PR status in status bar (colored indicators)
- `--from-pr 123` to resume PR-linked sessions
- Git worktrees supported (`-w` flag)

---

## Category 13: IDE Integration

- **VS Code:** `claude --ide` or extension
- **JetBrains:** Extension available
- **Desktop App:** Standalone GUI, handoff with `/desktop`
- **Chrome:** `claude --chrome` (beta)
- **Web:** Claude.ai sessions, handoff with `/teleport`

---

## Category 14: Subagents

### Built-in Agents
| Agent | Purpose |
|-------|---------|
| Explore | Read-only codebase search (fast, cheap) |
| Plan | Research for planning |
| general-purpose | Complex multi-step tasks |
| Bash | Isolated command execution |

### Creating Custom Agents
Location: `.claude/agents/agent-name.md`
Configure: tools, model, permissions, maxTurns, memory

### Background vs Foreground
- Foreground: blocks conversation, can ask permission
- Background: runs while you continue, pre-approved permissions, `Ctrl+B` to background

---

## Category 15: Additional Features

- **Session naming:** `/rename my-project` then `claude -r "my-project"`
- **Checkpointing:** `Esc+Esc` or `/rewind` to restore
- **Prompt suggestions:** Tab to accept suggested follow-up
- **Task list:** `Ctrl+T` to toggle visibility
- **Background bash:** `Ctrl+B` to background running commands
- **Plugins:** Bundled extensions (MCP + skills + hooks)

---

## Curriculum Difficulty Mapping

### Beginner (No Programming Knowledge)
Starting/stopping, conversation, `/help`, CLAUDE.md basics, `/init`, `/rewind`, permissions, `/clear`, image pasting

### Intermediate (Some Computer Comfort)
Slash commands deep dive, basic skills, MCP servers, permission modes, context management, subagents, session management, progressive disclosure

### Advanced (Technical Users)
Hooks, custom subagents, agent teams, fine-grained permissions, dynamic context injection, plugins, GitHub Actions, MCP development
