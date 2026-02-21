# AI Teams Controller - Frontend Reference for Android Native Development

**Version**: 1.0
**Last Updated**: 2026-02-20
**Purpose**: Complete UI/UX reference for recreating the web frontend as a native Android application

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Screen Architecture](#2-screen-architecture)
3. [Authentication Flow](#3-authentication-flow)
4. [Main Controller Interface](#4-main-controller-interface)
5. [Voice Input System](#5-voice-input-system)
6. [Terminal Interaction](#6-terminal-interaction)
7. [File Browser](#7-file-browser)
8. [Settings & Preferences](#8-settings--preferences)
9. [Real-time Features](#9-real-time-features)
10. [UI Components Library](#10-ui-components-library)
11. [Responsive Design Guidelines](#11-responsive-design-guidelines)
12. [Appendix](#12-appendix)

---

## 1. Application Overview

### Purpose
AI Teams Controller is a multi-agent tmux session manager with voice control. Users can:
- Monitor terminal output from multiple AI agent roles (PO, SM, TL, FE, BE, QA)
- Send commands via voice or text input
- Browse and edit project files
- Create and manage tmux teams

### Core Features
- **Voice-first input**: Hands-free recording with automatic speech-to-text
- **Multi-role monitoring**: Real-time terminal output from multiple agents
- **File management**: Tree view with syntax highlighting
- **Interactive shell**: Full terminal emulation
- **Team management**: Create, restart, and monitor tmux teams

### Technology Stack (for context)
- **Frontend**: React/Next.js (web) → **Target**: Android native
- **Voice**: Soniox STT → Android Speech Recognition API
- **Terminal**: xterm.js → Android Terminal emulator library
- **Real-time**: WebSocket → Android WebSocket/Socket.IO client

---

## 2. Screen Architecture

### 2.1 Navigation Structure

```
Login Screen
    ↓
Home Screen (2 tabs)
    ├─ Team Creator Tab (workflow designer)
    └─ Controller Tab (main interface) ← DEFAULT
        ├─ Monitor Tab (terminal output)
        ├─ Browse Tab (file browser)
        └─ Terminal Tab (interactive shell)
```

### 2.2 Screen Inventory

#### A. Login Screen
**Path**: `/login`
**Purpose**: User authentication

**Layout**:
- Centered card (max-width: 448dp)
- Logo/Title: "AI Teams Controller"
- Subtitle: "Sign in to access the dashboard"
- Email input (email type)
- Password input (password type)
- Submit button

**States**:
- Normal: "Sign in" button enabled
- Loading: "Signing in..." button disabled with spinner
- Error: Red alert box showing error message

**Validation**:
- Email: Required, valid email format
- Password: Required, minimum 1 character
- Form: Prevent duplicate submissions

**Flow**:
```
1. Enter credentials
2. Submit form
3. Validate inputs
4. Send POST to /api/auth/login
5. On success: Store JWT tokens, navigate to /
6. On error: Show error message
```

---

#### B. Home Screen
**Path**: `/`
**Purpose**: Main application hub

**Layout**:
```
┌─────────────────────────────────────┐
│  [Team Creator] [Controller] [Logout]  │  ← Top tabs
├─────────────────────────────────────┤
│                                     │
│         Tab Content Area            │
│         (full height)               │
│                                     │
└─────────────────────────────────────┘
```

**Top Navigation** (always visible):
- 3 items:
  1. Team Creator tab (Workflow icon)
  2. Controller tab (Terminal icon) ← **Default active**
  3. Logout button (right-aligned)

**Behavior**:
- Auth check: Redirect to login if not authenticated
- Tab switch: Instant without reload
- Logout: Clear tokens, navigate to login

---

#### C. Controller Screen (Main Interface)
**Path**: `/` → Controller tab
**Layout**: Sidebar + Main Content

```
┌──────┬────────────────────────────┐
│      │  Header (team, voice)      │
│ Side ├────────────────────────────┤
│ bar  │  [Monitor] [Browse] [Term] │  ← Sub-tabs
│      ├────────────────────────────┤
│ 224dp│                            │
│      │     Tab Content            │
│      │                            │
└──────┴────────────────────────────┘
```

**Sidebar** (left, 224dp width):
- Header: Title, HeadphoneButton, ThemeToggle
- Team list (scrollable)
- New Terminal button
- Restart Team button
- Kill Team button
- Settings panel (collapsible)

**Header** (top):
- Menu button (mobile only)
- Connection indicator (WiFi icon)
- Team name
- Voice controls (right):
  - Recording target indicator (pulsing red box)
  - Voice feedback button (with badge)
  - Voice input toggle
  - Voice output toggle
  - Voice settings button

**Sub-tabs**:
1. **Monitor**: Terminal output from selected role
2. **Browse**: File browser with tree + viewer
3. **Terminal**: Interactive shell (xterm)

---

## 3. Authentication Flow

### 3.1 Login Process

```
User opens app
    ↓
Check for stored tokens (SharedPreferences)
    ↓
┌─ Has valid token ─→ Navigate to Home
│
└─ No token/expired ─→ Show Login Screen
        ↓
    Enter credentials
        ↓
    Submit form
        ↓
┌─ Success ─→ Store tokens ─→ Navigate to Home
│
└─ Error ─→ Show error message ─→ Stay on Login
```

### 3.2 Token Management

**Storage** (Android SharedPreferences):
```kotlin
// Keys
ACCESS_TOKEN = "access_token"
REFRESH_TOKEN = "refresh_token"

// Values
access_token: String (JWT)
refresh_token: String (JWT)
```

**Auto-refresh**:
- Before API call: Check if access token expired
- If expired: Use refresh token to get new access token
- If refresh fails: Redirect to login

**API Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 3.3 Logout

**Process**:
1. Clear stored tokens from SharedPreferences
2. Disconnect WebSocket connections
3. Clear in-memory state
4. Navigate to Login screen

---

## 4. Main Controller Interface

### 4.1 Sidebar Navigation

**Width**: 224dp (desktop), full overlay (mobile <1024dp)

**Layout** (top to bottom):
```
┌──────────────────┐
│ TMUX Controller  │  ← Header
│ [🎧] [🌙]        │  ← Buttons
├──────────────────┤
│ Team List        │  ← Scrollable
│  • Team A        │
│  • Team B (3)    │  ← Notification badge
│  • Team C        │
├──────────────────┤
│ [New Terminal]   │  ← Button
│ [Restart Team]   │  ← Button
│ [Kill Team]      │  ← Destructive red
├──────────────────┤
│ ⚙ Settings ▼    │  ← Expandable panel
│  Polling: 1s     │
│  Lines: 200      │
│  Stop word       │
└──────────────────┘
```

#### Header Elements:

**1. Title**: "TMUX Controller" (text, bold)

**2. HeadphoneButton** (toggle):
- Icon: Headphones
- Purpose: Hardware mode toggle (enables keyboard shortcuts)
- States:
  - OFF: Ghost button (transparent)
  - ON: Green background, green icon
- Click: Toggle hardware mode

**3. ThemeToggle** (cycle):
- Icons: Sun (light), Moon (dark)
- Purpose: Switch theme (light/dark/system)
- Click: Cycle through themes
- Stores preference in SharedPreferences

**4. Collapse Button** (mobile only):
- Icon: ChevronLeft
- Purpose: Close sidebar overlay
- Visible: Only on mobile (<1024dp)

#### Team List:

**Item Layout**:
```
┌──────────────────────────┐
│ Team Name       │3│      │  ← Notification badge (if unread > 0)
│ Selected: ✓              │  ← Checkmark if selected
└──────────────────────────┘
```

**Visual States**:
- Normal: Default background
- Selected: Primary color background (blue)
- Hover: Lighter background (desktop)

**Click Behavior**:
- Select team
- Load team data
- Update Monitor/Browse/Terminal tabs
- Close sidebar (mobile)

**Notification Badge**:
- Red circle with number
- Shows unread count
- Max display: 99+ if count > 99

#### Action Buttons:

**1. New Terminal** (optional):
- Visible: Only if `onCreateTerminal` provided
- Click: Open create terminal dialog
- Disabled: During creation (shows spinner)

**2. Restart Team**:
- Visible: Only when team selected
- Color: Yellow/Warning
- Click: Confirm, then restart team
- Shows: Progress dialog during restart
- Disabled: During operation

**3. Kill Team**:
- Color: Red/Destructive
- Click: Confirm dialog, then kill team
- Confirmation: "Are you sure? This will terminate all processes."
- Shows: Progress dialog
- Disabled: During operation

#### Settings Panel:

**Expandable** (click "Settings ▼" to toggle)

**Controls**:
1. **Polling Interval** (dropdown):
   - Options: 0.5s, 1s, 2s
   - Default: 0.5s
   - Purpose: Terminal update frequency

2. **Capture Lines** (dropdown):
   - Options: 50, 100, 200, 500
   - Default: 100
   - Purpose: Number of terminal lines to fetch

3. **Stop Word** (text input):
   - Default: "thank you"
   - Purpose: Voice command finalization phrase

**Apply Behavior**:
- Changes persist to SharedPreferences
- Sync to server when authenticated
- Show success/error toast

### 4.2 Header Controls

**Layout** (left to right):
```
[☰] [📶] Team Name [1s] | [Target] [🔔3] [🎙] [🔊] [⚙]
```

#### Elements:

**1. Menu Button** (mobile only):
- Icon: Hamburger (3 lines)
- Click: Open sidebar overlay
- Visible: <1024dp only

**2. Connection Indicator**:
- Icon: WiFi/Signal
- States:
  - Green: Connected
  - Gray: Disconnected
  - Yellow pulsing: Reconnecting
- Tooltip: "Connected" / "Disconnected"

**3. Team Name**:
- Text: Current team name
- Font: Monospace
- Truncate: Ellipsis if too long
- No click action

**4. Polling Indicator** (when connected):
- Text: Polling interval (e.g., "1s")
- Font: Monospace, small
- Color: Muted
- Visible: Only when WebSocket connected

**5. Recording Target** (when recording):
- Background: Red, pulsing animation
- Text: "team-name / role-name"
- Font: Monospace
- Visible: Only during voice recording
- Animation: Scale 1.0 → 1.05 → 1.0 (repeat)

**6. Voice Feedback Button**:
- Icon: Bell
- Badge: Red circle with unread count (if > 0)
- Click: Open voice feedback panel
- Disabled: When no notifications

**7. Voice Input Toggle**:
- Icon: Microphone (off) / MicOff (on)
- Text: "Voice Input" / "Stop"
- States:
  - OFF: Ghost button
  - Connecting: Spinner
  - ON: Red/Destructive, pulsing
- Click: Toggle voice recording
- Shortcut: Cmd+Shift+V (Mac) / Ctrl+Shift+V (Windows/Android)
- Disabled: When no team/role selected

**8. Voice Output Toggle**:
- Icon: Volume2 (on) / VolumeX (off)
- Click: Toggle voice feedback audio
- States:
  - ON: Default
  - OFF: Muted appearance

**9. Voice Settings**:
- Icon: Settings/Gear
- Click: Open voice settings dialog
- Opens: Modal with voice preferences

---

## 5. Voice Input System

### 5.1 Recording Flow (Hands-Free Mode)

```
User clicks "Voice Input" button
    ↓
Request microphone permission
    ↓
Status: "connecting" (show spinner)
    ↓
Connect to Soniox WebSocket (wss://...)
    ↓
Status: "listening" (show mic icon, blue text)
    ↓
User speaks naturally
    │
    ├─ Real-time transcript displayed in voice box
    │  (e.g., "create a new file called app.js")
    │
    └─ User says stop word (default: "thank you")
        ↓
    Status: "processing" (clear transcript)
        ↓
    Status: "correcting" (show ✏️ yellow)
        ↓
    Stream corrected command from backend
        │
        └─ Display: "Create a new file called app.js"
            ↓
        Status: "sent" (show ✅ green)
            ↓
        Play acknowledgment beep (high pitch)
            ↓
        Status: "listening" (return to listening)
            │
            └─ Every 60s: Play reminder beep
                (prevents forgotten recording)
    ↓
User clicks "Stop" button
    ↓
Status: "idle"
    ↓
Play low beep (recording stopped)
```

### 5.2 Visual Feedback

#### Recording Target Indicator (header):
- **Element**: Red pulsing box
- **Text**: "team-name / role-name"
- **Animation**: Scale 1.0 → 1.05 → 1.0, repeat every 1s
- **Visibility**: Only when recording active

#### Voice Input Button:
- **States**:
  ```
  Idle:        [🎤 Voice Input]     (Ghost button)
  Connecting:  [⏳ Connecting...]   (Spinner)
  Recording:   [🔴 Stop]            (Red, pulsing)
  ```

#### Voice Transcript Box (below input area):
- **Layout**:
  ```
  ┌─────────────────────────────────┐
  │ 🎤 "create a new file..."   [X] │  ← Blue (listening)
  ├─────────────────────────────────┤
  │ ✏️ "Create a new file..."  [X] │  ← Yellow (correcting)
  ├─────────────────────────────────┤
  │ ✅ "Create a new file..."  [X] │  ← Green (sent)
  └─────────────────────────────────┘
  ```

- **Visibility**:
  - Hidden when no transcript (opacity: 0)
  - Animated fade-in when transcript appears
  - Auto-hides 2s after "sent" status

- **Clear Button** (X icon):
  - Click: Clear transcript, return to listening
  - Haptic feedback: Double-tap vibration pattern

#### Status Colors:
- 🎤 **Blue**: Listening (actively capturing)
- ✏️ **Yellow**: Correcting (LLM processing)
- ✅ **Green**: Sent (command delivered)
- 🔴 **Red**: Error state

### 5.3 Audio Feedback

**1. Start Recording**:
- Frequency: 880Hz
- Duration: 100ms
- Volume: Medium

**2. Stop Recording**:
- Frequency: 440Hz
- Duration: 100ms
- Volume: Medium

**3. Command Sent** (acknowledgment):
- Frequency: 1200Hz
- Duration: 150ms
- Volume: Medium

**4. Reminder Beep** (every 60s during recording):
- Frequency: 800Hz
- Duration: 120ms
- Volume: Very low (8% of normal)
- Purpose: Prevent forgotten recording

**Implementation**:
- Use Android AudioTrack or ToneGenerator
- Generate sine wave at specified frequency
- Play asynchronously (non-blocking)

### 5.4 Haptic Feedback

**1. Button Click** (voice toggle):
- Pattern: Single pulse (50ms)
- Intensity: Medium

**2. Transcript Clear**:
- Pattern: Double-tap (50ms, 30ms pause, 50ms)
- Intensity: Light

**3. Error**:
- Pattern: Long buzz (200ms)
- Intensity: Strong

**Implementation**:
- Use Android Vibrator service
- Check for permission (android.permission.VIBRATE)
- Fallback: No vibration if permission denied

### 5.5 Stop Word Configuration

**Default**: "thank you"

**Behavior**:
- User speaks phrase naturally at end of command
- Stop word triggers command finalization
- Stop word removed from transcript before sending
- Case-insensitive matching

**Examples**:
```
User says: "create a new file called app.js thank you"
Sent command: "create a new file called app.js"

User says: "run the tests thank you"
Sent command: "run the tests"
```

**Custom Stop Words** (via settings):
- Text input in voice settings dialog
- Validation: 1-50 characters, alphanumeric + spaces
- Saved to SharedPreferences
- Synced to server

### 5.6 Team/Role Change Safety

**Problem**: Voice command sent to wrong team if user switches during recording

**Solution**:
```
Record initial team ID when recording starts
    ↓
On team change:
    ├─ If recording active:
    │   ├─ Stop recording immediately
    │   ├─ Show toast: "Recording stopped (team changed)"
    │   └─ Discard pending command
    │
    └─ If not recording:
        └─ Allow team change normally
```

**Implementation**:
- Track `recordingStartedWithTeam` reference
- Compare with current team on change
- Auto-stop if mismatch detected

### 5.7 Error Handling

**Microphone Permission Denied**:
- Show alert dialog: "Microphone access required"
- Button: "Open Settings" (deep link to app settings)
- Button: "Cancel"

**Network Error** (WebSocket disconnect):
- Show status: "Reconnecting..." (yellow pulsing)
- Retry: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- Max retries: 5
- On failure: Show error, stop recording

**Backend Error** (LLM correction fails):
- Show toast: "Failed to process command"
- Return to listening state
- Preserve transcript for retry

---

## 6. Terminal Interaction

### 6.1 Monitor Tab Layout

```
┌─────────────────────────────────────┐
│  [PO] [SM] [TL] [FE] [BE] [QA]      │  ← Role tabs
├─────────────────────────────────────┤
│  Updated: 2026-02-18 14:22  [ON]    │  ← Status bar
├─────────────────────────────────────┤
│                                     │
│   Terminal Output (monospace)       │  ← Scrollable
│   $ run the tests                   │
│   ✓ Tests passed (24/24)            │
│   frontend/hooks/useVoiceRecorder.  │  ← File link
│   test.ts:123:10                    │
│                                     │
│   [Scroll to Bottom ↓]              │  ← FAB (if scrolled up)
│                                     │
├─────────────────────────────────────┤
│  🎤 "create a new file..."      [X] │  ← Voice transcript
├─────────────────────────────────────┤
│  [💬] [Input field...] [⏹] [↵]     │  ← Input area
│  ┌─────────────────────────────┐   │
│  │ run tests                    │   │  ← Autocomplete
│  │ run pytest                   │   │     (when typing)
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 6.2 Role Tabs

**Layout**:
- Horizontal scrollable tabs
- Each tab shows:
  - Activity dot (●)
  - Role name (e.g., "FE", "BE")

**Activity Indicator**:
- **Green dot**: Agent is active (responding/working)
  - Glow effect: box-shadow 0 0 6px green
  - Pulsing animation
- **Gray dot**: Agent is idle

**Visual States**:
- **Active tab**: Primary background (blue), bold text
- **Inactive tab**: Muted background, normal text
- **Hover**: Lighter background (desktop)

**Scroll Behavior**:
- Horizontal scroll if tabs overflow
- Scroll indicators (fade at edges)

### 6.3 Status Bar

**Elements** (left to right):
```
Updated: 2026-02-18 14:22:35  |  Streaming: ON
```

**1. Last Updated**:
- Format: "YYYY-MM-DD HH:mm:ss"
- Updates: Every time new output received
- Font: Monospace, small
- Color: Muted

**2. Auto-scroll Toggle** (click to toggle):
- **ON**: Green background, green text
- **OFF**: Yellow background, yellow text
- Click (when OFF): Scroll to bottom + re-enable
- Auto-disables: When user manually scrolls up

### 6.4 Terminal Output Rendering

#### ANSI Color Support:

**Implementation**:
- Parse ANSI escape codes (e.g., `\x1b[31m` for red)
- Convert to styled spans with color attributes
- Support: Foreground colors, background colors, bold, underline

**Example**:
```
Input:  \x1b[31mError:\x1b[0m File not found
Output: [RED]Error:[RESET] File not found
```

**Android**:
- Use SpannableString with ForegroundColorSpan
- Libraries: ANSI parser (custom or library like JAnsi)

#### User Request Highlighting:

**Pattern**: Lines starting with ">"

**Visual**:
- Background: Light blue (primary/10 opacity)
- Text: Normal foreground
- Padding: 8dp horizontal

**Example**:
```
Regular line (normal)
> User request line (highlighted background)
Regular line (normal)
```

#### File Path Detection & Linking:

**Patterns Detected**:
```
1. Absolute path with line:col
   /home/user/project/src/app.tsx:42:10

2. Relative path with line:col
   src/components/Button.tsx:15:5

3. Path with line only
   frontend/hooks/useAuth.ts:234

4. Simple path
   config/settings.json
```

**Visual**:
- Color: Blue (primary)
- Underline: Yes
- Clickable: Yes

**Click Behavior**:
1. Parse path, line number, column number
2. Switch to Browse tab
3. Load file in viewer
4. Scroll to line number (if specified)
5. Highlight column (if specified)

**Android Implementation**:
- Use ClickableSpan in SpannableString
- Regex to detect file paths
- onClick: Navigate to FileBrowser with path param

### 6.5 Input Area

**Layout**:
```
[MODE] [──── Input Field ────] [⏹] [↵]
```

#### Mode Toggle:

**Button** (left):
- **Chat Mode**: MessageSquare icon (💬), gray
- **Terminal Mode**: Terminal icon (⌨), green

**Click**: Toggle between modes

**Modes**:
1. **Chat Mode** (default):
   - Natural language commands
   - No autocomplete
   - No command history
   - Placeholder: "Type a message..."

2. **Terminal Mode**:
   - Full shell syntax (e.g., `cd src/`, `git status`)
   - Tab completion for paths
   - Arrow-up/down for history
   - Placeholder: "$ Enter command..."
   - Green border when active

#### Input Field:

**Type**: EditText (multiline capable)

**Behavior**:
- Font: Monospace
- Text size: 16sp (prevents zoom on Android)
- Auto-focus: After message sent
- Disable: During send (isPending)

**Keyboard Actions**:
- **Enter**: Send message/command
- **Shift+Enter**: New line (chat mode only)
- **Tab** (terminal mode): Trigger autocomplete
- **↑/↓** (terminal mode): Navigate history/suggestions
- **Escape**: Close autocomplete dropdown

#### Stop Button (⏹):

**Purpose**: Send Escape key to terminal (stop running process)

**Visual**:
- Icon: Square (stop symbol)
- Color: Red
- Size: 40dp × 40dp

**Click**: Send Escape key to active role

#### Send Button (↵):

**Purpose**:
- If input empty: Send Enter key (Ctrl+M)
- If has text: Send message/command

**Visual**:
- Icon: CornerDownLeft (enter arrow)
- Color: Primary (blue)
- Size: 40dp × 40dp

**States**:
- Enabled: Default
- Disabled: When isPending (sending)

**Tooltip** (long press):
- Empty input: "Send Enter key"
- Has text: "Send message"

### 6.6 Autocomplete Dropdown

**Trigger**:
- **Automatic**: Typing in terminal mode (debounced 200ms)
- **Manual**: Tab key press

**Layout**:
```
┌─────────────────────────────┐
│ run tests                   │  ← Suggestion 1 (selected)
│ run pytest                  │  ← Suggestion 2
│ git status                  │  ← Suggestion 3
│ cd src/                     │  ← Suggestion 4
│ ...                         │
└─────────────────────────────┘
```

**Position**: Above input field (bottom sheet or popup)

**Max Items**: 5 suggestions

**Types**:
1. **Command Suggestions** (fuzzy-matched):
   - "run tests", "git status", "cd", etc.
   - Fuzzy search: "rst" matches "run tests"

2. **Path Suggestions** (API-fetched):
   - Triggered by: `cd `, `ls `, `cat `, paths with `/`
   - Fetched from: `/api/files/autocomplete?path=...`
   - Examples: "src/", "lib/", "config/", "../"

**Navigation**:
- **↑/↓**: Navigate suggestions (loop at edges)
- **Tab/Enter**: Select highlighted suggestion
- **Escape**: Close dropdown

**Visual**:
- Selected: Primary background
- Unselected: Default background
- Hover: Lighter background (desktop)

**Loading State**:
- Show spinner when fetching paths
- Text: "Loading..."

**Dismissal**:
- Auto-dismiss: After selection
- Manual dismiss: Escape key
- Click outside: Close dropdown

### 6.7 Auto-scroll Behavior

**Enable** (auto-scroll ON):
- Default state on page load
- When new message arrives (if already at bottom)
- When user clicks FAB or status toggle

**Disable** (auto-scroll OFF):
- When user manually scrolls up
- When user clicks status toggle (if ON)

**Scroll-to-Bottom FAB**:
- **Visibility**: Shows when scrolled up more than 100dp
- **Position**: Bottom-right corner, 16dp margin
- **Icon**: Arrow down (↓)
- **Click**: Smooth scroll to bottom + re-enable auto-scroll
- **Animation**: Fade in/out

**Smooth Scroll**:
- Use Android smooth scroll animation
- Duration: 300ms

### 6.8 Command History (Terminal Mode)

**Storage**: In-memory array (max 100 commands)

**Add to History**:
- When Enter pressed in terminal mode
- Only non-empty commands
- Trim whitespace

**Navigate**:
- **↑**: Previous command (navigate up)
- **↓**: Next command (navigate down)
- **Loop**: At edges, stay at first/last

**Restore**:
- When navigating history, save current input
- When returning to bottom (↓ at last), restore saved input

**Persistence**:
- Reset on page reload (no persistence)
- Future: Save to SharedPreferences

---

## 7. File Browser

### 7.1 Browse Tab Layout

**Desktop (≥1024dp)**:
```
┌────────────────────────────────┐
│ [Search Files... ⌘P]           │  ← Search input
├───────────┬────────────────────┤
│           │                    │
│  File     │   File Viewer      │
│  Tree     │   (selected file)  │
│           │                    │
│  30%      │   70%              │
│           │                    │
└───────────┴────────────────────┘
```

**Mobile (<1024dp)**:
```
┌────────────────────────────────┐
│ [🔍 Search]                     │  ← Search button
├────────────────────────────────┤
│ [Files] [Viewer]               │  ← Tab toggle
├────────────────────────────────┤
│                                │
│   Tab Content (full width)     │
│                                │
└────────────────────────────────┘
```

### 7.2 File Tree

**Layout**:
```
┌────────────────────┐
│ [Refresh] [☑ Hidden] [+ New]   │  ← Toolbar
├────────────────────┤
│ 📁 src/            │  ← Folder (collapsible)
│   └─ 📄 app.tsx    │  ← File
│ 📁 lib/            │
│   ├─ 📄 auth.ts    │
│   └─ 📄 utils.ts   │
│ 📄 package.json    │
└────────────────────┘
```

#### Toolbar:

**1. Refresh Button**:
- Icon: Refresh/RotateCw
- Click: Reload file tree from server
- Spinner: During load

**2. Show Hidden Toggle**:
- Checkbox: "Show hidden files"
- Default: Checked (show hidden files)
- Stores: SharedPreferences (per-team key)

**3. New Button** (optional):
- Text: "+ New"
- Click: Show dropdown:
  - "New File"
  - "New Folder"
- Opens: Dialog with path input + directory picker

#### Tree Item:

**Visual**:
```
[Icon] Name  [Chevron if folder]
```

**Icons**:
- **Folders**: 📁 Folder icon
- **Code files**: Icon based on extension (e.g., .tsx → React icon)
- **Images**: 🖼 Image icon
- **Text**: 📄 Document icon

**States**:
- **Selected**: Primary background (blue)
- **Expanded folder**: Chevron points down (▼)
- **Collapsed folder**: Chevron points right (▶)
- **Hover**: Lighter background (desktop)

**Click Behavior**:
- **Folder**: Toggle expand/collapse
- **File**: Select file, load in viewer

**Long Press / Right-Click** (context menu):
- Copy Path
- Download (files) / Download as ZIP (folders)
- Rename
- Delete

#### Expansion State:

**Persistence** (SharedPreferences):
```kotlin
Key: "expanded_folders_${teamId}"
Value: JSON array of expanded paths
Example: ["src/", "src/components/", "lib/"]
```

**Restore**:
- On page load, expand folders in saved list
- Recursive: Expand parent folders first

### 7.3 File Viewer

**Layout**:
```
┌────────────────────────────────┐
│ src/components/Button.tsx      │  ← Breadcrumb
│ [📋 Copy] [💾 Download] [✏ Edit] │  ← Actions
├────────────────────────────────┤
│                                │
│   File Content                 │
│   (CodeViewer/MarkdownViewer)  │
│                                │
└────────────────────────────────┘
```

#### Breadcrumb:

**Format**: `src / components / Button.tsx`

**Click**: Navigate to folder (future enhancement)

#### Action Buttons:

**1. Copy** (📋):
- Icon: Clipboard
- Click: Copy file content to clipboard
- Toast: "Copied to clipboard"

**2. Download** (💾):
- Icon: Download
- Click: Save file to device storage
- Filename: Original filename
- Android: Use Download Manager or SAF

**3. Edit** (✏):
- Icon: Edit/Pencil
- Toggle: Readonly ↔ Edit mode
- **Readonly Mode**:
  - View only
  - Syntax highlighting
- **Edit Mode**:
  - Editable textarea
  - Save/Cancel buttons appear
  - Monospace font

#### Content Display (Readonly):

**Format Detection** (by extension):

1. **Code Files** (.tsx, .ts, .js, .py, .java, etc.):
   - Use CodeViewer
   - Syntax highlighting (Prism.js equivalent on Android)
   - Line numbers (optional)
   - Copy line button (on long press)

2. **Markdown** (.md, .mdx):
   - Use MarkdownViewer
   - Render formatted:
     - Headers (# ## ###)
     - Bold, italic, code
     - Links, lists, tables
   - Code blocks: Syntax highlighted

3. **Images** (.png, .jpg, .gif, .svg):
   - Use ImageView
   - Pinch to zoom
   - Pan gesture

4. **Binary Files** (.bin, .exe, .zip):
   - Placeholder: "Binary file cannot be displayed"
   - Show file size
   - Download button only

**Android Implementation**:
- Syntax highlighting: Use library like CodeView or Highlight.js WebView
- Markdown: Use Markwon library
- Images: Standard ImageView with zoom

#### Content Display (Edit Mode):

**Layout**:
```
┌────────────────────────────────┐
│ src/app.tsx                    │
├────────────────────────────────┤
│ [Editing file...]              │
│                                │
│ import React from 'react'      │  ← Editable
│ export default function App()  │
│ { ... }                        │
│                                │
├────────────────────────────────┤
│ [Cancel] [Save Changes]        │  ← Actions
└────────────────────────────────┘
```

**Behavior**:
- Text area with monospace font
- No syntax highlighting (plain text)
- Auto-save disabled (manual save only)

**Save**:
- Click "Save Changes"
- PUT to `/api/files/${teamId}/${filePath}` (path in URL, not query param)
- Body: plain text content (Content-Type: text/plain)
- On success: Exit edit mode, show toast
- On error: Show error toast, stay in edit mode

**Cancel**:
- Revert to original content
- Exit edit mode
- No confirmation if no changes made
- Confirm if changes exist

### 7.4 File Search (Cmd+P)

**Trigger**:
- **Keyboard**: Cmd+P (Mac), Ctrl+P (Windows/Android)
- **Button**: Search icon in header (mobile)

**Layout**:
```
┌────────────────────────────────┐
│  Search Files                  │  ← Title
├────────────────────────────────┤
│ [🔍] [____________________] [X] │  ← Input
├────────────────────────────────┤
│ 📄 src/app.tsx                 │  ← Result 1 (selected)
│    src/                        │     (folder path)
│ 📄 lib/utils.ts                │  ← Result 2
│    lib/                        │
│ 📄 hooks/useAuth.ts            │  ← Result 3
│    hooks/                      │
├────────────────────────────────┤
│ ↑↓ Navigate | Enter Open | Esc Close │  ← Footer
└────────────────────────────────┘
```

**Search Behavior**:
- **Real-time**: Search as you type (debounced 150ms)
- **Fuzzy matching**: "btn" matches "Button.tsx"
- **Max results**: 50 files
- **Ranking**:
  1. Exact filename match
  2. Filename starts with query
  3. Filename contains query
  4. Fuzzy match (uFuzzy algorithm)

**Result Item**:
- **Line 1**: Filename (bold, matched chars highlighted yellow)
- **Line 2**: Folder path (muted, small font)

**Keyboard Navigation**:
- **↑/↓**: Navigate results
- **Enter**: Select file, close dialog
- **Escape**: Close dialog

**Click**:
- Select file
- Close dialog
- Load file in viewer

**Empty State**:
- Query empty: "Start typing to search"
- No results: "No files found"

**Close**:
- Click X button
- Press Escape
- Click outside dialog (overlay)
- After selection

---

## 8. Settings & Preferences

### 8.1 Settings Locations

**1. Sidebar Settings Panel** (collapsible):
- Polling interval
- Capture lines
- Stop word

**2. Voice Settings Dialog** (modal):
- Stop word
- Noise filter level
- Speech speed
- Technical terms (vocabulary)
- Translation terms (misheard → correct)

**3. Theme Toggle** (header button):
- Light/Dark/System

### 8.2 Sidebar Settings Panel

**Layout** (collapsed):
```
┌────────────────┐
│ ⚙ Settings ▼   │  ← Click to expand
└────────────────┘
```

**Layout** (expanded):
```
┌─────────────────────────┐
│ ⚙ Settings ▲            │
├─────────────────────────┤
│ Polling Interval        │
│ [dropdown: 0.5s▼]       │
├─────────────────────────┤
│ Capture Lines           │
│ [slider: 200]           │
│ 50 ────●──── 500        │
├─────────────────────────┤
│ Stop Word               │
│ [thank you____]         │
├─────────────────────────┤
│ [Apply Settings]        │
└─────────────────────────┘
```

**Controls**:

**1. Polling Interval**:
- **Type**: Dropdown/Spinner
- **Options**: 0.5s, 1s, 2s
- **Default**: 0.5s
- **Purpose**: Terminal update frequency (faster = more responsive, higher CPU)

**2. Capture Lines**:
- **Type**: Dropdown/Spinner
- **Options**: 50, 100, 200, 500
- **Default**: 100
- **Label**: Shows current value
- **Purpose**: Number of terminal lines to fetch

**3. Stop Word**:
- **Type**: Text input (EditText)
- **Default**: "thank you"
- **Validation**: 1-50 chars, alphanumeric + spaces
- **Purpose**: Voice command finalization phrase

**Apply Button**:
- **Text**: "Apply Settings"
- **Click**: Save to SharedPreferences + sync to server
- **Success**: Toast "Settings applied ✓"
- **Error**: Toast "Failed to save settings"

### 8.3 Voice Settings Dialog

**Trigger**: Click voice settings button (⚙) in header

**Layout**:
```
┌────────────────────────────────┐
│  Voice Recognition Settings    │
├────────────────────────────────┤
│ [Terms] [Translations]         │  ← Tabs
├────────────────────────────────┤
│                                │
│   Tab Content                  │
│                                │
├────────────────────────────────┤
│ [Reset] [Cancel] [Save]        │
└────────────────────────────────┘
```

#### Tab 1: Technical Terms

**Purpose**: Add vocabulary for better speech recognition

**Layout**:
```
┌────────────────────────────────┐
│ Technical Terms                │
│ Add domain-specific vocabulary │
├────────────────────────────────┤
│                                │
│ [Textarea: comma-separated]    │
│ Claude Code, tmux, FastAPI,    │
│ TypeScript, React...           │
│                                │
└────────────────────────────────┘
```

**Input**:
- **Type**: Textarea (multiline)
- **Format**: Comma-separated
- **Example**: "Claude Code, tmux, FastAPI, TypeScript, React, Next.js, Soniox, pytest"
- **Max length**: 2000 chars

**Default Terms**:
```
Claude Code, tmux, FastAPI, TypeScript, React, Next.js, Soniox,
pytest, Vitest, WebSocket, xterm, uFuzzy, ANSI, Git, GitHub,
API, JWT, OAuth, SSL, TLS, SSH, Docker, Kubernetes, PostgreSQL,
MongoDB, Redis, Celery, Nginx, Anthropic, OpenAI, LangChain
```

#### Tab 2: Translation Fixes

**Purpose**: Map common mishearings to correct terms

**Layout**:
```
┌────────────────────────────────┐
│ Translation Term Mappings      │
│ Map mishearings to correct     │
├────────────────────────────────┤
│ [Misheard] → [Correct]    [X]  │
│ tea mux → tmux            [X]  │
│ cross code → Claude Code  [X]  │
│ reaction → React          [X]  │
│ ...                            │
├────────────────────────────────┤
│ [+ Add Mapping]                │
└────────────────────────────────┘
```

**List Items**:
- **Layout**: Source → Target, Delete button
- **Scrollable**: Max height 400dp
- **Delete**: Click X to remove mapping

**Add Mapping**:
- Click "+ Add Mapping"
- Adds new row with empty inputs
- Focus on first input

**Validation**:
- Both source and target required
- Max 50 chars each
- Duplicates allowed (later overrides)

**Default Mappings**:
```
tea mux → tmux
cross code → Claude Code
reaction → React
time X → tmux
view test → Vitest
pie test → pytest
sonics → Soniox
X term → xterm
web socket → WebSocket
API → API
```

#### Footer Buttons:

**1. Reset to Defaults** (🔄):
- Icon: RotateCcw
- Click: Confirm dialog
- Confirmation: "Reset to default settings?"
- Action: Restore defaults, mark as changed

**2. Cancel**:
- Click: Close dialog, discard changes
- No confirmation if no changes
- Confirm if changes exist: "Discard changes?"

**3. Save Changes**:
- Click: Save to SharedPreferences + sync server
- Success: Toast "Settings saved ✓", close dialog
- Error: Toast error message, stay open

### 8.4 Additional Settings (Future)

**Noise Filter Level** (voice settings):
- Dropdown: very-low, low, medium, high, very-high
- Default: medium
- Purpose: Background noise reduction

**Speech Speed** (voice settings):
- Slider: 0.5x - 2.0x
- Default: 0.58x
- Purpose: Voice feedback playback speed

**Theme** (header toggle):
- Cycle: Light → Dark → System
- System: Follow device theme

### 8.5 Settings Persistence

**Local Storage** (SharedPreferences):
```kotlin
// Keys
POLLING_INTERVAL = "polling_interval"
CAPTURE_LINES = "capture_lines"
STOP_WORD = "stop_word"
TECHNICAL_TERMS = "technical_terms"
TRANSLATION_TERMS = "translation_terms"
NOISE_FILTER = "noise_filter"
SPEECH_SPEED = "speech_speed"
THEME = "theme"
EXPANDED_FOLDERS = "expanded_folders_${teamId}"
SHOW_HIDDEN_FILES = "show_hidden_files"

// Defaults
polling_interval: 500 (ms)
capture_lines: 100
stop_word: "thank you"
technical_terms: [default list]
translation_terms: [default mappings]
noise_filter: "medium"
speech_speed: 0.58
theme: "system"
```

**Server Sync**:
- Endpoint: PUT `/api/settings`
- Body: JSON with all settings
- Auth: JWT token required
- On success: Update local copy
- On error: Keep local, show error

**Cross-device**:
- On login: Fetch settings from server
- Merge with local: Server takes precedence
- Save merged settings locally

---

## 9. Real-time Features

### 9.1 WebSocket Connections

**1. Pane State WebSocket** (terminal output):
- **URL**: `ws://voice-backend.hungson175.com/api/ws/state/{team_id}/{role_id}`
- **Protocol**: Custom (JSON messages)
- **Purpose**: Stream terminal output updates

**2. Voice Feedback WebSocket** (voice output):
- **URL**: `ws://voice-backend.hungson175.com/api/voice/ws/feedback/global`
- **Protocol**: Custom (JSON messages)
- **Purpose**: Receive voice feedback audio

**3. Interactive Terminal WebSocket** (shell):
- **URL**: `ws://voice-terminal.hungson175.com/socket.io`
- **Protocol**: Socket.IO
- **Purpose**: Bidirectional terminal I/O

### 9.2 Pane Polling Flow

**Connect**:
```
1. User selects team
2. Connect WebSocket
3. Send initial request
```

**Message Protocol**:

**Client → Server** (on connect):
```json
{
  "interval": 0.5,
  "captureLines": 100,
  "pause": false
}
```

**Server → Client** (on content change):
```json
{
  "output": "$ npm test\n✓ Tests passed\n",
  "lastUpdated": "2026-02-20T14:22:35Z",
  "isActive": true,
  "highlightText": null
}
```

**Polling**:
- Server polls tmux at the configured interval and sends updates only when content changes
- Keepalive ping every 30s if no change
- Rate limit: 200ms minimum between sends

**Reconnection**:
- On disconnect: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- Max retries: 5
- Show status: "Reconnecting..." (yellow)
- On failure: Show error, stop polling

### 9.3 Voice Feedback Flow

**Connect**:
```
1. User enables voice output
2. Connect WebSocket
3. Subscribe to feedback channel
```

**Message Protocol**:

**Server → Client**:
```json
{
  "type": "voice_feedback",
  "team_id": "command-center",
  "role_id": "BE",
  "summary": "Task completed. Created the API endpoint...",
  "audio": "base64_encoded_mp3_data",
  "team_name_formatted": "command-center",
  "team_name_audio": "base64_encoded_team_name_audio",
  "timestamp": 1708456789
}
```

**Playback**:
1. Decode base64 `audio` → byte array
2. Play via MediaPlayer (complete MP3, not chunked)
3. Show notification badge when new feedback received
4. Mark as read when user clicks notification

**Android Implementation**:
- Use MediaPlayer for MP3 playback
- Each message contains a complete MP3 audio (not chunked)
- `team_name_audio` can be played as announcement before summary

### 9.4 Interactive Terminal Flow

**Connect**:
```
1. User switches to Terminal tab
2. Connect Socket.IO WebSocket
3. Send initial size + scrollback request
```

**Events** (Socket.IO):

**Client → Server**:
```
emit("join", { team_id: "command-center" })
emit("input", { team_id, data: "ls -la\n" })
emit("resize", { team_id, cols: 80, rows: 24 })
```

**Server → Client**:
```
on("output", (data) => { /* append to terminal */ })
on("scrollback", (data) => { /* initial history */ })
on("exit", (data) => { /* process exited */ })
```

**Flow Control** (ACK protocol):
```
Client sends large input
    ↓
Server buffers input
    ↓
Server sends ACK when ready
    ↓
Client sends next chunk
```

**Android Implementation**:
- Use Socket.IO Java client library
- Terminal emulator: xterm.js equivalent (TermView library)
- Handle resize on orientation change

---

## 10. UI Components Library

### 10.1 Button Variants

**1. Primary** (default action):
- Background: Primary color (blue)
- Text: White
- States: Normal, Pressed, Disabled
- Example: "Save Changes"

**2. Destructive** (danger action):
- Background: Red
- Text: White
- States: Normal, Pressed, Disabled
- Example: "Kill Team"

**3. Outline** (secondary action):
- Background: Transparent
- Border: Primary color
- Text: Primary color
- States: Normal, Pressed, Disabled
- Example: "Cancel"

**4. Ghost** (tertiary action):
- Background: Transparent
- No border
- Text: Default foreground
- States: Normal, Pressed (light background)
- Example: Icon buttons

**5. Icon** (icon-only):
- Size: 40dp × 40dp
- Icon: 20dp × 20dp
- Padding: 10dp
- Shape: Circular or square
- Example: Stop, Send buttons

### 10.2 Input Components

**1. Text Input** (EditText):
- Height: 40dp
- Padding: 12dp horizontal
- Border: 1dp, gray
- Focus: Blue border, 2dp
- Font: 16sp (prevents zoom on Android)
- Placeholder: Gray text

**2. Textarea** (EditText multiline):
- Min height: 80dp
- Max height: 200dp (scrollable)
- Padding: 12dp
- Border: Same as text input
- Font: 16sp

**3. Dropdown/Spinner**:
- Height: 40dp
- Padding: 12dp horizontal
- Chevron icon: Right side
- Click: Show options dialog/bottom sheet

**4. Slider** (SeekBar):
- Height: 24dp
- Thumb: 16dp circle
- Track: 4dp height
- Min/Max labels: 12sp
- Current value: 14sp, bold

**5. Checkbox**:
- Size: 20dp × 20dp
- Border: 2dp
- Check icon: White, bold
- States: Unchecked, Checked, Disabled

**6. Toggle Switch**:
- Width: 48dp
- Height: 24dp
- Thumb: 20dp circle
- States: Off (gray), On (primary color)

### 10.3 Status Indicators

**1. Activity Dot**:
- Size: 8dp circle
- Colors:
  - Green: Active (with glow)
  - Gray: Inactive
- Animation: Pulse when active (scale 1.0 → 1.2 → 1.0)

**2. Badge**:
- Background: Red
- Text: White, 10sp
- Shape: Circular or pill
- Max display: 99+
- Position: Top-right corner of parent

**3. Connection Status**:
- Icon: WiFi signal
- Colors:
  - Green: Connected
  - Gray: Disconnected
  - Yellow: Reconnecting (pulsing)

**4. Spinner** (loading):
- Size: 20dp (small), 40dp (medium), 60dp (large)
- Color: Primary
- Animation: Circular indeterminate

### 10.4 Dialogs

**1. Modal Dialog**:
- Position: Center screen
- Overlay: Semi-transparent black (50% opacity)
- Max width: 90% screen width, 600dp max
- Padding: 24dp
- Rounded corners: 8dp

**2. Alert Dialog**:
- Title: Bold, 18sp
- Message: Normal, 14sp
- Buttons: Positive (right), Negative (left)
- Example: Confirmation, Error messages

**3. Bottom Sheet** (mobile):
- Position: Bottom edge, slides up
- Max height: 80% screen
- Drag handle: Top center
- Dismiss: Swipe down or tap outside

**4. Full Screen Dialog** (for complex forms):
- AppBar: Back button, Title, Action button
- Content: Scrollable
- Footer: Cancel/Save buttons

### 10.5 Cards

**Layout**:
```
┌────────────────────┐
│ Header             │  ← Optional
├────────────────────┤
│                    │
│ Content            │
│                    │
├────────────────────┤
│ Footer             │  ← Optional
└────────────────────┘
```

**Style**:
- Border: 1dp, gray
- Background: Card background color
- Padding: 16dp
- Rounded corners: 8dp
- Elevation: 2dp shadow

**Usage**:
- Settings panels
- Team list items
- File tree items

### 10.6 Tooltips (Long Press)

**Trigger**: Long press on icon button

**Display**:
- Background: Dark gray (light theme), Light gray (dark theme)
- Text: White (light theme), Black (dark theme)
- Font: 12sp
- Padding: 8dp horizontal, 4dp vertical
- Position: Above or below element
- Arrow: Points to element

**Example**:
- Long press Stop button → "Send Escape key"
- Long press Send button → "Send message"

### 10.7 Tabs

**Layout**:
```
┌───────────────────────┐
│ [Tab 1] [Tab 2] [Tab 3] │  ← Tab bar
├───────────────────────┤
│                       │
│   Tab Content         │
│                       │
└───────────────────────┘
```

**Tab Item**:
- Height: 48dp
- Padding: 12dp horizontal
- Text: 14sp
- Icon: 20dp × 20dp (optional)

**States**:
- **Active**: Primary color, bold text, underline indicator
- **Inactive**: Muted color, normal text
- **Disabled**: Gray, non-clickable

**Scrollable** (if overflow):
- Horizontal scroll
- Fade indicators at edges

### 10.8 Toast Messages

**Layout**:
- Position: Bottom center (desktop), Top (mobile)
- Width: Auto, max 90% screen
- Padding: 16dp
- Rounded corners: 8dp
- Duration: 3-5 seconds

**Variants**:
- **Success**: Green background, white text, checkmark icon
- **Error**: Red background, white text, X icon
- **Info**: Blue background, white text, info icon

**Dismiss**:
- Auto-dismiss after duration
- Manual dismiss: Swipe away or tap X button

---

## 11. Responsive Design Guidelines

### 11.1 Breakpoints

**Desktop**: ≥1024dp
- Full sidebar visible
- Split panels (file tree + viewer)
- All features available

**Tablet**: 768dp - 1023dp
- Sidebar toggleable
- File browser tabs instead of split
- Condensed spacing

**Mobile**: <768dp
- Sidebar hidden by default (hamburger menu)
- Full-width content
- Tab-based layouts
- Larger touch targets (48dp min)
- Simplified navigation

### 11.2 Sidebar Behavior

**Desktop (≥1024dp)**:
- Always visible
- Fixed width: 224dp
- Cannot collapse

**Mobile (<1024dp)**:
- Hidden by default
- Hamburger menu button to open
- Slides in as full-width overlay
- Auto-closes on team selection
- Swipe left to close

### 11.3 File Browser Behavior

**Desktop (≥1024dp)**:
```
┌────────┬─────────┐
│ Tree   │ Viewer  │
│ 30%    │ 70%     │
└────────┴─────────┘
```
- Resizable split panels
- Drag divider to adjust width

**Mobile (<768dp)**:
```
┌──────────────┐
│ [Files] [Viewer] │  ← Tabs
├──────────────┤
│ Content      │
└──────────────┘
```
- Single tab at a time
- Switch via tab toggle

### 11.4 Input Area Behavior

**Desktop**:
- Mode toggle visible with label
- All buttons visible
- Input field flexible width

**Mobile**:
- Mode toggle visible (icon only)
- All buttons visible
- Input field fills space
- Keyboard: Shows IME, resizes layout

### 11.5 Touch Targets

**Minimum Size**: 48dp × 48dp

**Components**:
- Buttons: 40dp × 40dp (within 48dp touch area)
- List items: Full width, 48dp min height
- Checkboxes: 20dp × 20dp (within 48dp touch area)
- Tab items: Full width, 48dp height

**Padding**: Add padding to increase touch area

### 11.6 Typography

**Font Sizes**:
- **Display**: 24sp (screen titles)
- **Heading**: 18sp (section headers)
- **Body**: 14sp (normal text)
- **Caption**: 12sp (secondary text)
- **Monospace**: 14sp (code, terminal)

**Line Height**:
- Body: 1.5× font size
- Heading: 1.2× font size
- Code: 1.4× font size

**Font Families**:
- **Sans-serif**: Roboto (default Android)
- **Monospace**: Roboto Mono

### 11.7 Colors

**Light Theme**:
- Primary: #2563EB (blue)
- Background: #FFFFFF (white)
- Foreground: #0F172A (dark blue)
- Muted: #94A3B8 (gray)
- Destructive: #EF4444 (red)
- Success: #22C55E (green)

**Dark Theme**:
- Primary: #3B82F6 (lighter blue)
- Background: #0F172A (dark blue)
- Foreground: #F1F5F9 (light gray)
- Muted: #64748B (gray)
- Destructive: #F87171 (lighter red)
- Success: #4ADE80 (lighter green)

**System Theme**:
- Follow device setting (light/dark)
- Auto-switch at sunset/sunrise

---

## 12. Appendix

### 12.1 Key User Flows

#### Voice Command Flow:
```
1. User clicks Voice Input button
2. Grant microphone permission (first time)
3. Status: "connecting" → "listening"
4. User speaks: "create a new file called app.js"
5. Real-time transcript displayed
6. User says stop word: "thank you"
7. Status: "processing" → "correcting"
8. LLM correction streamed: "Create a new file called app.js"
9. Status: "sent" (green checkmark)
10. Play acknowledgment beep
11. Return to "listening" (hands-free continues)
12. Repeat steps 4-11 for next command
13. User clicks Stop button
14. Status: "idle", play low beep
```

#### File Browsing Flow:
```
1. User switches to Browse tab
2. File tree loads (or from cache)
3. User clicks folder to expand
4. User clicks file to view
5. File content loads in viewer (syntax highlighted)
6. User clicks Edit button
7. Content becomes editable
8. User makes changes
9. User clicks Save
10. Changes synced to server
11. Success toast shown
12. Exit edit mode
```

#### Terminal Interaction Flow:
```
1. User switches to Monitor tab
2. Select role tab (e.g., FE)
3. Terminal output displays (real-time streaming)
4. User types command in input: "run tests"
5. Autocomplete shows suggestions
6. User presses Tab to select suggestion
7. User presses Enter to send
8. Command added to history
9. Output streams to terminal
10. User scrolls up to review
11. Auto-scroll disables, FAB appears
12. User clicks FAB
13. Smooth scroll to bottom, auto-scroll re-enables
```

### 12.2 API Endpoints Reference

**Authentication**:
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

**Teams**:
- `GET /api/teams` - List active tmux sessions
- `GET /api/teams/available` - List loadable teams
- `POST /api/teams/create-terminal` - Create new tmux session
- `GET /api/teams/{team_id}/roles` - List panes for team
- `GET /api/teams/{team_id}/roles/{role_id}/dimensions` - Pane size
- `POST /api/teams/{team_id}/kill` - Kill team
- `POST /api/teams/{team_id}/restart` - Restart team

**Send**:
- `POST /api/send/{team_id}/{role_id}` - Send message/command to pane

**Files**:
- `GET /api/files/{team_id}/tree` - Directory tree (lazy loading)
- `GET /api/files/{team_id}/content?path=...` - Read file content
- `GET /api/files/{team_id}/list` - Flat file list (for search)
- `GET /api/files/{team_id}/search?q=...` - Content search
- `GET /api/files/{team_id}/download?path=...` - Download raw file
- `GET /api/files/{team_id}/download-zip?path=...` - Download folder as ZIP
- `POST /api/files/{team_id}/create` - Create file/folder
- `PUT /api/files/{team_id}/{path}` - Save file content (edit mode)
- `PATCH /api/files/{team_id}/rename` - Rename file/folder
- `DELETE /api/files/{team_id}/delete` - Delete file/folder
- `GET /api/files/autocomplete?path=...&team=...` - Path autocomplete

**WebSockets**:
- `WS /api/ws/state/{team_id}/{role_id}` - Pane output stream (on backend :17061)
- `WS /api/voice/ws/feedback/global` - Voice feedback stream (on backend :17061)
- `WS /socket.io` - Interactive terminal (on terminal service :17071)

**Voice**:
- `POST /api/voice/token/soniox` - Get Soniox API key
- `POST /api/voice/command/{team_id}/{role_id}` - Send voice command
- `POST /api/voice/task-done/{team_id}/{role_id}` - Trigger voice feedback

**Pane State** (REST fallback):
- `GET /api/state/{team_id}/{role_id}` - Get pane output (polling)

**Settings**:
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### 12.3 Error Handling Patterns

**Network Errors**:
- Show toast: "Network error. Please try again."
- Retry: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- Max retries: 5
- Fallback: Show error state, allow manual retry

**Auth Errors** (401 Unauthorized):
- Clear tokens
- Redirect to login
- Show toast: "Session expired. Please log in again."

**Permission Errors** (microphone, storage):
- Show alert dialog explaining permission
- Button: "Open Settings" (deep link)
- Button: "Cancel"
- Remember denial (don't ask again after 2 denials)

**WebSocket Disconnects**:
- Show status: "Reconnecting..." (yellow)
- Retry: Exponential backoff
- Max retries: 5
- On failure: Show error, stop trying

**Validation Errors**:
- Inline: Red border + error text below input
- Toast: For form-level errors
- Prevent submission until fixed

### 12.4 Performance Considerations

**Terminal Output**:
- Limit: 500 lines max in memory
- Trim: Remove old lines when exceeding limit
- Virtualization: Render only visible lines (RecyclerView)

**File Tree**:
- Lazy loading: Load children on folder expand
- Cache: Store expanded state, file content
- Pagination: Load large directories in chunks

**Autocomplete**:
- Debounce: 200ms delay before API call
- Cancel: Cancel pending requests on new input
- Cache: Store results for recent queries

**WebSocket**:
- Reconnect: Exponential backoff
- Heartbeat: Ping/pong every 30s
- Flow control: ACK protocol for large messages

**Images**:
- Lazy loading: Load when scrolled into view
- Caching: Use Glide or Picasso library
- Placeholder: Show while loading

### 12.5 Accessibility

**Screen Reader**:
- Label all interactive elements (contentDescription)
- Announce state changes (e.g., "Recording started")
- Describe icon-only buttons

**Keyboard Navigation** (for desktop Android):
- Tab: Navigate between inputs
- Arrow keys: Navigate lists
- Enter: Activate buttons
- Escape: Close dialogs

**Contrast**:
- Minimum: 4.5:1 for text
- Minimum: 3:1 for large text (18sp+)
- Use color contrast checker

**Touch Targets**:
- Minimum: 48dp × 48dp
- Spacing: 8dp between adjacent targets

**Text Scaling**:
- Support: Android font size settings
- Use: sp units for text, not dp
- Test: With large text enabled

---

## End of Frontend Reference

**For Questions/Clarifications**:
- Refer to source code: `frontend/` directory
- API documentation: `docs/tech/api/`
- Design system: Shadcn/ui (React) → Material Design (Android)

**Next Steps**:
1. Set up Android project with Material Design 3
2. Implement authentication flow
3. Build WebSocket client (Socket.IO, custom WS)
4. Implement voice recording (Android Speech API or Soniox SDK)
5. Create UI components library
6. Build main screens (Login, Controller, File Browser)
7. Integrate real-time features
8. Test on devices (phone, tablet)
9. Optimize performance
10. Accessibility audit

**Good luck with the Android native development! 🚀**
