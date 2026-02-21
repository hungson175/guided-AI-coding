# AI Teams Controller - System Architecture Overview

**Audience:** Android developer building a native client
**Last Updated:** 2026-02-20

---

## 1. System Architecture

Three services form the backend infrastructure. The Android client replaces the web frontend.

```
                     Cloudflare Tunnel
                           |
          +----------------+----------------+
          |                |                |
  voice-ui:3334    voice-backend:17061  voice-terminal:17071
   (Next.js)          (FastAPI)         (Node.js PTY)
          |                |                |
          +-------+--------+--------+-------+
                  |                  |
              PostgreSQL           Redis
           (users, settings)   (cache, Celery broker,
                                pub/sub for voice feedback)
                  |
              Celery Workers
           (voice feedback pipeline:
            LLM summary + TTS audio)
```

**Backend (FastAPI, port 17061):** REST API + WebSocket. Manages teams (tmux sessions), panes, voice commands, file browser, auth. Talks to tmux via subprocess. Delegates async voice feedback to Celery workers.

**Terminal Service (Node.js, port 17071):** PTY server using `node-pty`. Provides real interactive terminal sessions over Socket.io/WebSocket. The web frontend connects here for the "Interactive Terminal" view (xterm.js in browser). Shares JWT secret with backend for auth.

**Frontend (Next.js, port 3334):** Web UI with team management, pane monitoring, voice input, file browser, terminal emulator. This is what the Android client replaces.

---

## 2. Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend API | FastAPI (Python) | REST + WebSocket endpoints |
| Database | PostgreSQL (asyncpg) | Users, settings |
| Cache/Broker | Redis | Celery tasks, pub/sub, dedup cache |
| Task Queue | Celery | Async voice feedback (LLM + TTS) |
| Terminal | Node.js + node-pty | Interactive PTY sessions |
| STT | Soniox | Real-time speech-to-text (WebSocket) |
| LLM | XAI Grok (`grok-4-fast-non-reasoning`) | Voice command correction, feedback summaries |
| TTS | Google Cloud TTS (vi-VN Neural2) | Voice feedback audio |
| Auth | JWT (HS256) | 48h access + 7d refresh tokens |
| Tunnel | Cloudflare (cloudflared) | Public HTTPS exposure |

---

## 3. Key Flows

### 3A. Voice Command Flow (End-to-End)

```
Android Mic → Soniox WebSocket (direct, wss://stt-rt.soniox.com)
           → Real-time transcription
           → Stop word detected ("thank you" or user-configured)
           → POST /api/voice/command/{team_id}/{role_id}
              Body: { raw_command, transcript, speed? }
           → Backend: LLM corrects command (XAI Grok)
           → Backend: sends corrected command to tmux pane (send-keys)
           → Response: { corrected_command, is_backlog_task }
```

**Soniox connection setup:**
1. `POST /api/voice/token/soniox` → get API key (no auth required)
2. Open WebSocket to `wss://stt-rt.soniox.com/transcribe-websocket`
3. Send JSON config frame: `{ api_key, model: "stt-rt-v4", sample_rate: 16000, num_channels: 1, audio_format: "pcm_s16le", language_hints: ["vi", "en"], language_hints_strict: true }`
4. Stream binary PCM16 audio chunks
5. Receive JSON transcription results

### 3B. Voice Feedback Flow (Task Completion)

```
Claude finishes task → Stop hook fires
  → POST /api/voice/task-done/{team_id}/{role_id}
  → Backend captures pane output (200 lines)
  → Queues Celery task (returns immediately)
  → Celery worker:
     1. Trims output to last user command
     2. Generates LLM summary (Grok, temp=0.3)
     3. Generates TTS audio (Google Cloud TTS, base64 MP3)
     4. Publishes to Redis pub/sub channel "voice_feedback"
  → Backend relays to WebSocket clients
  → WS /api/voice/ws/feedback/global delivers:
     { type: "voice_feedback", team_id, role_id, summary, audio (base64), team_name_formatted, team_name_audio, timestamp }
```

### 3C. Terminal Monitoring Flow

```
Android → WS /api/ws/state/{team_id}/{role_id}
       → Send config: { interval: 0.5, captureLines: 100 }
       → Server polls tmux capture-pane at interval
       → Sends updates only when content changes
       → Keepalive ping every 30s
```

### 3D. Interactive Terminal Flow

```
Android → Socket.io to voice-terminal:17071
       → Authenticate with JWT token
       → Bidirectional: keystrokes ↔ terminal output
       → Full PTY emulation (node-pty)
```

### 3E. Send Command Flow (Non-Voice)

```
POST /api/send/{team_id}/{role_id}
Body: { message: "the command text" }
→ Backend: tmux send-keys to target pane
→ Two-enter rule: send command + Enter, wait 300ms, send Enter again
```

---

## 4. Authentication Model

**Type:** JWT with PostgreSQL user store

**Login:**
```
POST /api/auth/login
Body: { email, password }
Response: {
  user: { id, email, username },
  tokens: { access_token, refresh_token, token_type: "bearer" }
}
```

**Token Details:**
- Access token: 48 hours, HS256
- Refresh token: 7 days, HS256
- Header: `Authorization: Bearer {access_token}`

**Token Refresh:**
```
POST /api/auth/refresh
Body: { refresh_token }
Response: { access_token, refresh_token, token_type }
```

**Current User:**
```
GET /api/auth/me → { id, email, username, is_active }
```

**Unprotected Routes (no auth needed):**
- `/health/*` - Health checks
- `/api/auth/*` - Login, register, refresh
- `/api/voice/*` - Voice endpoints (token, command, task-done)
- `/ws/*` - WebSocket connections
- `/api/settings` - User settings

**Registration:** Disabled (security). Users created directly in DB by admin.

---

## 5. Real-Time Communication Patterns

### WebSocket: Pane State Monitoring
```
WS /api/ws/state/{team_id}/{role_id}

Client sends (on connect):
{ interval: 0.5, captureLines: 100, pause: false }

Server sends (on content change):
{ output: "terminal text...", isActive: true, lastUpdated: "...", highlightText: null }

Keepalive: server pings every 30s if no change
Rate limit: 200ms minimum between sends
```

### WebSocket: Voice Feedback
```
WS /api/voice/ws/feedback/global

Server sends:
{
  type: "voice_feedback",
  team_id: "command-center",
  role_id: "BE",
  summary: "Task completed. Created the API endpoint...",
  audio: "base64-encoded-mp3-data",
  team_name_formatted: "command-center",
  team_name_audio: "base64-encoded-team-name-audio",
  timestamp: 1708456789
}
```

### Polling: Team/Role Lists
```
GET /api/teams            → List all tmux sessions
GET /api/teams/{id}/roles → List panes with activity status

Poll interval: 10s recommended for team list
```

---

## 6. Deployment Topology

```
Local Machine (Ubuntu)
├── PostgreSQL :5432
├── Redis :6379
├── FastAPI Backend :17061 ──┐
├── Celery Workers           │  Cloudflare Tunnel
├── Terminal Service :17071 ─┤  (cloudflared)
└── Next.js Frontend :3334 ──┘       │
                                      ↓
                         voice-ui.hungson175.com → :3334
                         voice-backend.hungson175.com → :17061
                         voice-terminal.hungson175.com → :17071
```

**Process management:** systemd user services with auto-restart. Health watchdog checks every 30s, auto-restarts unhealthy services.

**Android client connects to:**
- `https://voice-backend.hungson175.com` (REST + WS)
- `https://voice-terminal.hungson175.com` (Socket.io for PTY)
- `wss://stt-rt.soniox.com` (direct STT, no proxy)

---

## 7. What Android Client Replicates vs What Stays Server-Side

### Android Client MUST Implement

| Feature | Web Equivalent | Android Approach |
|---------|---------------|-----------------|
| **Auth (JWT)** | AuthContext + localStorage | Encrypted SharedPreferences / DataStore |
| **Team/Role selection** | TmuxController + useTeamState | RecyclerView or Compose list |
| **Pane output monitoring** | usePanePolling (WebSocket) | OkHttp WebSocket client |
| **Send commands** | POST /api/send | Retrofit/OkHttp POST |
| **Voice recording** | useVoiceRecorder + AudioCapture | Android AudioRecord (16kHz, PCM16) |
| **Soniox STT** | SonioxSTTService (WebSocket) | OkHttp WebSocket to Soniox |
| **Voice feedback playback** | VoiceFeedbackContext (WebSocket) | OkHttp WS + MediaPlayer (MP3 from base64) |
| **Stop word detection** | StopWordDetector | Port logic or use Android SpeechRecognizer |
| **File browser** | FileBrowser + FileTree | TreeView or expandable RecyclerView |
| **Interactive terminal** | xterm.js + Socket.io | Socket.io Android client + terminal emulator lib |
| **Settings** | SettingsContext | GET/PUT /api/settings + local cache |

### Stays Server-Side (Android Does NOT Touch)

| Component | Why |
|-----------|-----|
| **tmux management** | Backend subprocess calls |
| **LLM correction** | Backend calls XAI Grok API |
| **TTS generation** | Celery worker + Google Cloud TTS |
| **Voice feedback pipeline** | Celery + Redis pub/sub |
| **File system operations** | Backend accesses project files |
| **User database** | PostgreSQL managed by backend |
| **Team creation/restart** | Backend runs setup-team.sh |

### Key API Endpoints for Android

**Essential (MVP):**
```
POST   /api/auth/login                    # Login
POST   /api/auth/refresh                  # Token refresh
GET    /api/teams                         # List teams
GET    /api/teams/{id}/roles              # List panes
GET    /api/state/{team}/{role}           # Get pane output (REST fallback)
WS     /api/ws/state/{team}/{role}        # Pane output stream
POST   /api/send/{team}/{role}            # Send command
POST   /api/voice/token/soniox           # Get STT token
POST   /api/voice/command/{team}/{role}   # Send voice command
WS     /api/voice/ws/feedback/global      # Voice feedback stream
```

**Extended:**
```
GET    /api/files/{team}/tree             # File tree
GET    /api/files/{team}/content?path=... # File content
GET    /api/files/{team}/list             # File list for search
GET    /api/files/{team}/search?q=...     # Content search
GET    /api/files/{team}/download?path=...      # Download raw file
GET    /api/files/{team}/download-zip?path=...  # Download folder as ZIP
POST   /api/files/{team}/create           # Create file/folder
PATCH  /api/files/{team}/rename           # Rename file/folder
DELETE /api/files/{team}/delete           # Delete file/folder
PUT    /api/files/{team}/{path}           # Save file content (edit)
GET    /api/settings                      # User settings
PUT    /api/settings                      # Update settings
GET    /api/teams/{team}/roles/{role}/dimensions  # Pane size
GET    /api/teams/available               # List loadable teams
POST   /api/teams/create-terminal         # Create new tmux session
POST   /api/teams/{team}/kill             # Kill team
POST   /api/teams/{team}/restart          # Restart team
```

---

## 8. Audio Recording Spec (for Android)

The Soniox STT service expects:
- **Sample rate:** 16,000 Hz
- **Format:** PCM signed 16-bit little-endian (pcm_s16le)
- **Channels:** Mono
- **Chunk size:** ~4096 bytes per WebSocket frame
- **Echo cancellation:** Recommended
- **Noise suppression:** Recommended

Android equivalent: `AudioRecord` with `ENCODING_PCM_16BIT`, `CHANNEL_IN_MONO`, `16000` sample rate. Stream raw PCM bytes over WebSocket.

---

## 9. Configuration Reference

**Environment variables the Android client needs to know about (hardcoded or configurable):**

```
Backend URL:    https://voice-backend.hungson175.com
Terminal URL:   https://voice-terminal.hungson175.com
Soniox WS:     wss://stt-rt.soniox.com/transcribe-websocket
```

**User-configurable settings (synced via /api/settings):**
- `detection_mode`: "stopword" (default)
- `stop_word`: "thank you" (default, user-configurable)
- `noise_filter_level`: "low" | "medium" | "high"
- `theme`: "light" | "dark" | "system"
- `silence_duration_ms`: 0-30000 (for silence detection mode)
