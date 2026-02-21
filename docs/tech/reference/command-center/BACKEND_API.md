# AI Teams Controller - Backend API Reference

Complete API documentation for building an Android native client.

**Base URLs:**
- Local development: `http://localhost:17061` (FastAPI backend)
- Local terminal service: `http://localhost:17071` (Node.js terminal)
- Production: `https://voice-backend.hungson175.com` (FastAPI via reverse tunnel)
- Production terminal: `https://voice-terminal.hungson175.com`

**Frontend reference:** `https://voice-ui.hungson175.com` (existing Next.js web client)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Teams & Panes](#2-teams--panes)
3. [Pane State WebSocket](#3-pane-state-websocket)
4. [Terminal Service](#4-terminal-service)
5. [Voice Pipeline](#5-voice-pipeline)
6. [File Browser](#6-file-browser)
7. [Settings](#7-settings)
8. [Health Checks](#8-health-checks)
9. [System](#9-system)
10. [Templates](#10-templates)
11. [Error Handling](#11-error-handling)
12. [CORS & Security](#12-cors--security)

---

## 1. Authentication

All API endpoints (except `/health` and login) require a JWT Bearer token.

### 1.1 Login

```
POST /api/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "admin",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00"
  },
  "tokens": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer"
  }
}
```

**Error (401):**
```json
{"detail": "Invalid email or password"}
```

**Token Lifetime:**
- Access token: 48 hours (2880 minutes)
- Refresh token: 7 days

### 1.2 Refresh Token

```
POST /api/auth/refresh
Content-Type: application/json
```

**Request:**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

**Response (200):**
```json
{
  "tokens": {
    "access_token": "eyJhbGciOi...(new)",
    "refresh_token": "eyJhbGciOi...(new)",
    "token_type": "bearer"
  }
}
```

### 1.3 Get Current User

```
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "admin",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00"
  }
}
```

### 1.4 Logout

```
POST /api/auth/logout
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{"message": "Logged out successfully"}
```

Stateless operation - client should discard tokens. No server-side token revocation.

### 1.5 Using the Token

Include in all authenticated requests:

```
Authorization: Bearer <access_token>
```

WebSocket connections skip auth middleware - they do not need the header.

---

## 2. Teams & Panes

A "team" is a tmux session with multiple "panes" (roles). Each pane runs a Claude Code AI agent.

### 2.1 List Teams

```
GET /api/teams
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "teams": [
    {
      "id": "command-center",
      "name": "command-center",
      "isActive": true
    },
    {
      "id": "personal_assistant",
      "name": "personal_assistant",
      "isActive": false
    }
  ]
}
```

`isActive` is true if any pane in the team has recent activity.

### 2.2 List Available Teams (Including Inactive)

```
GET /api/teams/available
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "teams": [
    {
      "name": "command-center",
      "path": "docs/tmux/command-center",
      "hasSetupScript": true,
      "isActive": true
    }
  ]
}
```

### 2.3 List Roles (Panes) in a Team

```
GET /api/teams/{team_id}/roles
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "teamId": "command-center",
  "roles": [
    {"id": "pane-0", "name": "PO", "order": 0, "isActive": true},
    {"id": "pane-1", "name": "SM", "order": 1, "isActive": false},
    {"id": "pane-2", "name": "TL", "order": 2, "isActive": false},
    {"id": "pane-3", "name": "FE", "order": 3, "isActive": true},
    {"id": "pane-4", "name": "BE", "order": 4, "isActive": true},
    {"id": "pane-5", "name": "QA", "order": 5, "isActive": false}
  ]
}
```

`isActive` indicates the pane content changed since the last check (activity detection).

### 2.4 Get Pane Output (REST, One-Shot)

```
GET /api/state/{team_id}/{role_id}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "output": "$ ls\nfile1.txt  file2.txt\n$ _",
  "lastUpdated": "2026-02-17T14:30:00.000Z",
  "highlightText": null,
  "isActive": true
}
```

### 2.5 Send Message to Pane

```
POST /api/send/{team_id}/{role_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "message": "hello world"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message sent to pane-0",
  "sentAt": "2026-02-17T14:30:00.000Z"
}
```

This types the message into the tmux pane (like a keyboard). The message is sent with a trailing Enter key.

### 2.6 Get Pane Dimensions

```
GET /api/teams/{team_id}/roles/{role_id}/dimensions
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "cols": 120,
  "rows": 40
}
```

Useful for rendering terminal output correctly. Panes narrower than 40 columns may cause WebSocket flooding with fast AI output.

### 2.7 Kill Team

```
POST /api/teams/{team_id}/kill
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Team command-center killed",
  "setupScriptRun": null
}
```

### 2.8 Restart Team

```
POST /api/teams/{team_id}/restart
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Team command-center restarted",
  "setupScriptRun": true
}
```

### 2.9 Restart Single Pane

```
POST /api/teams/{team_id}/roles/{role}/restart
Authorization: Bearer <token>
```

Restarts a single agent pane: sends Ctrl+C, re-runs claude command, sends /init-role.

### 2.10 Create Terminal Session

```
POST /api/teams/create-terminal
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "my-terminal",
  "directory": "/home/user/project"
}
```

Both fields are optional. `name` defaults to `terminal-HHMMSS`, `directory` defaults to home directory.

**Response (200):**
```json
{
  "success": true,
  "teamId": "my-terminal",
  "message": "Terminal session created"
}
```

---

## 3. Pane State WebSocket

Real-time streaming of pane output. Preferred over polling `GET /api/state`.

### 3.1 Connection

```
ws://localhost:17061/api/ws/state/{team_id}/{role_id}
```

No authentication header required (WebSocket connections bypass auth middleware).

### 3.2 Server Messages

**Pane output update:**
```json
{
  "output": "terminal content here...",
  "lastUpdated": "2026-02-17T14:30:00.000Z",
  "highlightText": null,
  "isActive": true
}
```

**Keepalive (every 30 seconds):**
```json
{
  "type": "keepalive",
  "timestamp": 1739789400.0
}
```

### 3.3 Client Messages

**Set poll interval (seconds):**
```json
{"interval": 2}
```
Valid values: 0.5, 1, 2, 5. Default: 1.

**Set capture lines:**
```json
{"captureLines": 200}
```
Range: 50-500. Default: 100.

**Pause/resume streaming:**
```json
{"pause": true}
```

**Ping:**
```
ping
```
Server responds with `pong`.

### 3.4 Rate Limiting

Server enforces max 5 messages/second (200ms minimum interval) to prevent WebSocket flooding from rapid terminal output.

---

## 4. Terminal Service

Interactive terminal access via a separate Node.js service on port 17071. Supports both Socket.io and raw WebSocket.

### 4.1 Health Check

```
GET http://localhost:17071/health
```

**Response (200):**
```json
{
  "status": "ok",
  "terminals": 2,
  "uptime": 86400
}
```

### 4.2 List Active Terminals

```
GET http://localhost:17071/api/terminals
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {"name": "default", "clients": 1},
  {"name": "build", "clients": 0}
]
```

### 4.3 Send Input to Terminal

```
POST http://localhost:17071/api/terminals/{name}/send
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{"data": "ls -la\n"}
```

**Response (200):**
```json
{"ok": true, "sent": 6}
```

### 4.4 Read Terminal Output

```
GET http://localhost:17071/api/terminals/{name}/read?lines=50
Authorization: Bearer <token>
```

**Response (200):**
```json
{"output": "$ ls -la\ntotal 64\ndrwxr-xr-x ..."}
```

Query parameter `lines` is optional (0 = all buffered output). Returns 404 if terminal not found.

### 4.5 Clear Terminal Buffer

```
POST http://localhost:17071/api/terminals/{name}/clear
Authorization: Bearer <token>
```

### 4.6 Resize Terminal

```
POST http://localhost:17071/api/terminals/{name}/resize
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{"cols": 120, "rows": 40}
```

### 4.7 Raw WebSocket Connection

```
ws://localhost:17071/terminal?token=<JWT>&terminal=<name>
```

**Parameters:**
- `token`: JWT access token (required)
- `terminal`: Terminal name (default: "default"). Created on first connection.

**Client to Server:**
- Plain text: typed directly into the PTY
- JSON resize: `{"type": "resize", "cols": 120, "rows": 40}`

**Server to Client:**
- Raw terminal output bytes (ANSI escape codes included)

On connect, the server sends the full output buffer (scrollback).

**Default PTY:** bash shell, 80x30, cwd = home directory.

### 4.8 Socket.io Connection

```javascript
const socket = io("http://localhost:17071", {
  query: { terminal: "default" },
  auth: { token: "<JWT>" }
});
```

**Events:**

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `data` | Server->Client | `string` | Terminal output |
| `data` | Client->Server | `string` | Keyboard input |
| `resize` | Client->Server | `{cols, rows}` | Resize PTY |
| `ack` | Client->Server | `int` (bytes) | Flow control ack |
| `exit` | Server->Client | `int` (exit code) | Terminal process exited |

**Flow control:** Server pauses at 100KB unacknowledged output. Client sends `ack` with byte count to resume.

---

## 5. Voice Pipeline

Voice interaction flow: STT (speech-to-text) -> LLM correction -> tmux command -> agent processes -> Stop hook -> TTS summary -> WebSocket playback.

### 5.1 Get Soniox API Key (for STT)

```
POST /api/voice/token/soniox
```

No auth required.

**Response (200):**
```json
{
  "api_key": "soniox_api_key_here"
}
```

**Error (500):** API key not configured.

The Android client uses this key to connect directly to Soniox's streaming STT API.

### 5.2 Send Voice Command

After STT transcription, send the corrected command to a pane.

```
POST /api/voice/command/{team_id}/{role_id}
Content-Type: application/json
```

No auth required.

**Request:**
```json
{
  "raw_command": "go go show me the git status",
  "transcript": "show me the git status",
  "speed": 0.8
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `raw_command` | string | yes | Full transcript including stop word |
| `transcript` | string | yes | Command text with stop word removed |
| `speed` | float | no | TTS playback speed 0.5-2.0 (default: 0.8) |

**Response (200):**
```json
{
  "success": true,
  "corrected_command": "git status",
  "error": null
}
```

The backend:
1. Gets the target pane's recent output for context
2. Corrects the voice transcript using an LLM (fixes typos, formats for CLI)
3. Sends the corrected command to the tmux pane
4. Stores pending command for voice feedback correlation

### 5.3 Transcribe Audio (REST)

```
POST /api/voice/transcribe
Content-Type: multipart/form-data
```

No auth required.

**Request:** Form field `audio` with audio file upload.

**Response (200):**
```json
{
  "transcription": "hello world",
  "success": true,
  "error": null
}
```

### 5.4 Notify Task Done (Stop Hook)

Called by Claude Code's Stop hook when an agent finishes responding. Triggers TTS voice feedback.

```
POST /api/voice/task-done/{team_id}/{role_id}
Content-Type: application/json
```

No auth required.

**Request:**
```json
{
  "session_id": "claude-session-id",
  "transcript_path": "/path/to/transcript",
  "team_id": "command-center",
  "role_id": "pane-0",
  "role_name": "PO"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | Claude Code session identifier |
| `transcript_path` | string | yes | Path to conversation transcript |
| `team_id` | string | no | Must match path param if provided |
| `role_id` | string | no | Must match path param if provided |
| `role_name` | string | no | Role name from tmux @role_name option |

**Response (200):**
```json
{
  "success": true,
  "summary": null,
  "command_id": "fa4803d1-007c-4181-9347-464b665b6c6b",
  "error": null
}
```

The `summary` is null in the immediate response because processing happens async in Celery. The actual summary + audio arrives via the voice feedback WebSocket.

### 5.5 Voice Feedback WebSocket

Receive TTS audio when agents finish processing commands.

```
ws://localhost:17061/api/voice/ws/feedback/global
```

No auth required. Connects to a global channel that receives feedback from ALL teams.

**Server Messages:**
```json
{
  "type": "voice_feedback",
  "team_id": "command-center",
  "role_id": "pane-0",
  "summary": "Done. Fixed the authentication bug and all tests pass.",
  "audio": "<base64-encoded MP3 audio>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"voice_feedback"` |
| `team_id` | string | Which team the feedback is from |
| `role_id` | string | Which pane (e.g., `"pane-0"`) |
| `summary` | string | LLM-generated summary of what the agent did (Vietnamese) |
| `audio` | string | Base64-encoded MP3 audio of the summary spoken by TTS |

**Client Messages:**
- Send `"ping"` to receive `"pong"` (keepalive)

**Android Implementation Notes:**
- Decode the base64 `audio` field to bytes
- Play as MP3 using Android's `MediaPlayer` or `ExoPlayer`
- Filter by `team_id` if the user is viewing a specific team
- Audio is generated using Google Cloud TTS (Neural2 Vietnamese voice)

### 5.6 Voice Feedback WebSocket (Per-Team, Deprecated)

```
ws://localhost:17061/api/voice/ws/feedback/{team_id}/{role_id}
```

Same protocol as global. Use the global endpoint instead.

---

## 6. File Browser

Browse and edit files in a team's project directory.

### 6.1 Get File Tree

```
GET /api/files/{team_id}/tree?path=/&depth=2&show_hidden=true
Authorization: Bearer <token>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | `/` | Relative path within project |
| `depth` | int | 1 | Levels to expand (1-5) |
| `show_hidden` | bool | true | Include dotfiles |

**Response (200):**
```json
{
  "project_root": "/home/user/dev/my-project",
  "tree": [
    {
      "name": "src",
      "path": "src",
      "type": "directory",
      "size": null,
      "children": [
        {
          "name": "main.py",
          "path": "src/main.py",
          "type": "file",
          "size": 1234,
          "children": null
        }
      ]
    }
  ]
}
```

### 6.2 Flat File List (for Fuzzy Search)

```
GET /api/files/{team_id}/list?limit=10000&show_hidden=false
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "files": [
    {"path": "src/main.py", "isDir": false},
    {"path": "src/utils/", "isDir": true}
  ],
  "total": 250,
  "truncated": false,
  "project_root": "/home/user/dev/my-project"
}
```

Excludes: `node_modules`, `__pycache__`, `.git`, `venv`, `.venv`, `dist`, `build`.

### 6.3 Search Files by Name

```
GET /api/files/{team_id}/search?q=main
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "results": [
    {"path": "src/main.py", "match_count": 1},
    {"path": "backend/app/main.py", "match_count": 1}
  ],
  "total": 2,
  "query": "main"
}
```

Case-insensitive. Results cached for 5 minutes.

### 6.4 Read File Content

```
GET /api/files/{team_id}/content?path=src/main.py
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "path": "src/main.py",
  "name": "main.py",
  "size": 1234,
  "mime_type": "text/x-python",
  "content": "import sys\n...",
  "is_binary": false,
  "is_truncated": false,
  "error": null
}
```

- Max file size: 1MB (larger files return `is_truncated: true`, `content: null`)
- Binary files: `is_binary: true`, `content: null`
- Sensitive files (`.env`, `*.pem`): returns error

### 6.5 Save File Content

```
PUT /api/files/{team_id}/{path}
Authorization: Bearer <token>
Content-Type: text/plain
```

The request body is the raw file content (plain text, not JSON).

**Example:** `PUT /api/files/command-center/src/main.py`

**Response (200):**
```json
{
  "success": true,
  "message": "File saved",
  "path": "src/main.py",
  "size": 1500
}
```

- Max file size: 10MB (returns 413 if exceeded)
- Protected paths (`.git`, `node_modules`, `__pycache__`, `.venv`): returns 403

### 6.6 Create File or Folder

```
POST /api/files/{team_id}/create
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "path": "src/new_module.py",
  "type": "file"
}
```

`type` must be `"file"` or `"folder"`.

**Response (200):**
```json
{
  "success": true,
  "path": "src/new_module.py",
  "type": "file",
  "message": "File created"
}
```

### 6.7 Delete File or Folder

```
DELETE /api/files/{team_id}/delete
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "path": "src/old_file.py"
}
```

Protected paths cannot be deleted: `.git`, `node_modules`, `__pycache__`, `.venv`.

### 6.8 Rename File or Folder

```
PATCH /api/files/{team_id}/rename
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "old_path": "src/old_name.py",
  "new_name": "new_name.py"
}
```

`new_name` is just the filename, not a full path. Invalid characters (`/<>\:"|?*`) are rejected.

**Response (200):**
```json
{
  "success": true,
  "old_path": "src/old_name.py",
  "new_path": "src/new_name.py",
  "type": "file",
  "message": "Renamed successfully"
}
```

### 6.9 Path Autocomplete

```
GET /api/files/autocomplete?path=src/&team=command-center&limit=10
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "completions": [
    {"path": "src/main.py", "isDir": false, "name": "main.py"},
    {"path": "src/utils/", "isDir": true, "name": "utils"}
  ]
}
```

---

## 7. Settings

User preferences stored in the database.

### 7.1 Get Settings

```
GET /api/settings
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "detection_mode": "silence",
  "stop_word": "go go",
  "noise_filter_level": "medium",
  "silence_duration_ms": 1500,
  "theme": "dark",
  "updated_at": "2026-02-17T14:30:00"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `detection_mode` | string | `"silence"`, `"stopword"` | How to detect end of speech |
| `stop_word` | string | max 50 chars | Trigger phrase for stopword mode |
| `noise_filter_level` | string | `"very-low"`, `"low"`, `"medium"`, `"high"`, `"very-high"` | Background noise filtering |
| `silence_duration_ms` | int | 0-30000 | Silence duration before command sent |
| `theme` | string | `"light"`, `"dark"`, `"system"` | UI theme |

### 7.2 Update Settings

```
PUT /api/settings
Authorization: Bearer <token>
Content-Type: application/json
```

Partial updates supported - only include fields you want to change.

**Request:**
```json
{
  "theme": "dark",
  "silence_duration_ms": 2000
}
```

**Response (200):** Full updated settings object (same schema as GET).

---

## 8. Health Checks

No authentication required for any health endpoint.

### 8.1 Overall Health

```
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "components": {
    "fastapi": "healthy",
    "celery": "healthy",
    "pubsub": "healthy",
    "redis": "healthy"
  },
  "version": "b0ed60c"
}
```

`status` values: `"healthy"`, `"degraded"` (some components down), `"unhealthy"`.

### 8.2 Celery Worker Health

```
GET /health/celery
```

**Response (200):**
```json
{
  "status": "healthy",
  "worker_count": 1,
  "code_version": "b0ed60c",
  "tasks_processed": 42,
  "skip_roles": ["SM", "TL", "FE", "BE", "QA"]
}
```

### 8.3 Redis Health

```
GET /health/redis
```

**Response (200):**
```json
{
  "status": "healthy",
  "connected": true
}
```

### 8.4 PubSub Health

```
GET /health/pubsub
```

**Response (200):**
```json
{
  "status": "healthy",
  "listener_running": true,
  "connected_clients": 2
}
```

---

## 9. System

### 9.1 Browse Directories

```
GET /api/system/directories?path=~&show_hidden=false
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "tree": [
    {
      "name": "dev",
      "path": "/home/user/dev",
      "type": "directory",
      "size": null,
      "children": [
        {
          "name": "project",
          "path": "/home/user/dev/project",
          "type": "directory",
          "size": null,
          "children": null
        }
      ]
    }
  ]
}
```

Tilde (`~`) expands to home directory.

---

## 10. Templates

Team templates for creating new multi-agent teams.

### 10.1 List Templates

```
GET /api/templates
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "templates": [
    {
      "name": "scrum-team",
      "display_name": "Scrum Development Team",
      "description": "6-role scrum team with PO, SM, TL, FE, BE, QA",
      "version": "1.0",
      "roles": [
        {"id": "po", "name": "Product Owner", "description": "Manages backlog", "optional": false},
        {"id": "sm", "name": "Scrum Master", "description": "Facilitates process", "optional": false}
      ]
    }
  ]
}
```

### 10.2 Get Single Template

```
GET /api/templates/{template_name}
Authorization: Bearer <token>
```

### 10.3 Create Team from Template

```
POST /api/templates/create
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "template_name": "scrum-team",
  "project_name": "my-new-project",
  "prd": "Build a mobile app for tracking fitness goals..."
}
```

**Response (200):**
```json
{
  "success": true,
  "team_id": "my-new-project",
  "message": "Team created and started",
  "output_dir": "/home/user/dev/tmux-teams/my-new-project"
}
```

---

## 11. Error Handling

### 11.1 Error Response Format

All errors use FastAPI's standard format:

```json
{
  "detail": "Error description"
}
```

For validation errors (422):
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "field_name"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

### 11.2 HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Normal response |
| 400 | Bad Request | Validation error, path traversal attempt |
| 401 | Unauthorized | Missing/invalid/expired JWT token |
| 403 | Forbidden | Protected path, registration disabled |
| 404 | Not Found | Team, file, or resource doesn't exist |
| 413 | Payload Too Large | File > 10MB |
| 422 | Validation Error | Request body fails Pydantic validation |
| 500 | Server Error | Internal error, API failure |

### 11.3 Common Error Scenarios

**Token expired:**
```json
// 401
{"detail": "Token has expired"}
```
Solution: Call `/api/auth/refresh` with the refresh token.

**Team not found:**
```json
// 404
{"detail": "Team 'nonexistent' not found"}
```

**Path traversal blocked:**
```json
// 400
{"detail": "Path traversal not allowed"}
```

---

## 12. CORS & Security

### 12.1 CORS

The backend allows cross-origin requests from:
- `http://localhost:3334` (local development)
- `https://voice-ui.hungson175.com` (production)

Credentials (cookies, auth headers) are allowed. For an Android client making direct HTTP requests, CORS does not apply - it is a browser-only restriction.

### 12.2 Security Notes

1. **Path traversal protection:** All file operations block `..` in paths
2. **Protected paths:** Cannot modify `.git`, `node_modules`, `__pycache__`, `.venv`
3. **Sensitive files:** `.env` and `*.pem` files cannot be read via the API
4. **JWT tokens:** Stateless - not revoked server-side. Client must discard on logout.
5. **Registration disabled:** New users can only be created directly in the database
6. **WebSocket auth:** WebSocket connections bypass auth middleware. Terminal service WebSocket requires JWT in query parameter.

### 12.3 Rate Limits

No explicit rate limits on REST endpoints. WebSocket pane state has a 200ms minimum send interval (5 msg/sec max).

---

## Appendix A: Quick Start for Android

1. **Login** with `POST /api/auth/login` to get JWT tokens
2. **List teams** with `GET /api/teams`
3. **List panes** with `GET /api/teams/{id}/roles`
4. **Stream pane output** via WebSocket `ws://.../api/ws/state/{team}/{role}`
5. **Send commands** with `POST /api/send/{team}/{role}`
6. **Voice feedback** via WebSocket `ws://.../api/voice/ws/feedback/global`
7. **Browse files** with `GET /api/files/{team}/tree`
8. **Interactive terminal** via WebSocket `ws://.../terminal?token=JWT&terminal=name` (port 17071)

## Appendix B: Environment Configuration

For development, configure your Android app with:

```kotlin
const val BASE_URL = "http://10.0.2.2:17061"      // FastAPI (Android emulator -> localhost)
const val TERMINAL_URL = "http://10.0.2.2:17071"   // Terminal service
const val WS_BASE = "ws://10.0.2.2:17061"          // WebSocket
const val TERMINAL_WS = "ws://10.0.2.2:17071"      // Terminal WebSocket
```

For production:
```kotlin
const val BASE_URL = "https://voice-backend.hungson175.com"
const val TERMINAL_URL = "https://voice-terminal.hungson175.com"
const val WS_BASE = "wss://voice-backend.hungson175.com"
const val TERMINAL_WS = "wss://voice-terminal.hungson175.com"
```
