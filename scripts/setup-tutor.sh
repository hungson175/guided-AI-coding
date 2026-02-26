#!/bin/bash

# Guided AI Coding — Tmux Team Setup
# Creates a tmux session with 2 windows (STUDENT + TUTOR) + linked sessions
# Each linked session views one window, enabling independent xterm.js connections
# Tutor runs in ~/tutor-workspace/ to avoid reading project CLAUDE.md

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="guided_ai_coding"
PROMPTS_DIR="$PROJECT_ROOT/prompts"
TUTOR_WORKSPACE="$HOME/tutor-workspace"

# Window sizing
WINDOW_WIDTH=220
WINDOW_HEIGHT=50

echo "Starting Guided AI Coding Team Setup..."
echo "Project Root: $PROJECT_ROOT"
echo "Session Name: $SESSION_NAME"
echo "Tutor Workspace: $TUTOR_WORKSPACE"

# 1. Always clean up orphaned linked sessions first (they may exist from partial runs)
tmux kill-session -t guided_student 2>/dev/null || true
tmux kill-session -t guided_tutor 2>/dev/null || true

# Check if base session already exists
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "Session '$SESSION_NAME' already exists!"
    read -p "Kill existing session and create new one? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tmux kill-session -t $SESSION_NAME
        echo "Killed existing session"
    else
        echo "Aborted. Use 'tmux attach -t $SESSION_NAME' to attach"
        exit 0
    fi
fi

# 2. Provision tutor workspace (outside project tree)
echo "Provisioning tutor workspace..."
mkdir -p "$TUTOR_WORKSPACE"/{prompts,memory,projects,.claude/hooks}

# Migrate memory on first run (if not already present)
if [ ! -f "$TUTOR_WORKSPACE/memory/progress.md" ] && [ -f "$PROJECT_ROOT/tutor/memory/progress.md" ]; then
    echo "Migrating tutor memory to workspace..."
    cp "$PROJECT_ROOT/tutor/memory/"*.md "$TUTOR_WORKSPACE/memory/" 2>/dev/null || true
fi

# Copy hook script and settings
cp "$PROJECT_ROOT/scripts/tutor-hooks/session_start_tutor.py" "$TUTOR_WORKSPACE/.claude/hooks/"
chmod +x "$TUTOR_WORKSPACE/.claude/hooks/session_start_tutor.py"
cp "$PROJECT_ROOT/scripts/tutor-hooks/settings.json" "$TUTOR_WORKSPACE/.claude/settings.json"

# 3. Start new tmux session
echo "Creating tmux session '$SESSION_NAME'..."
cd "$PROJECT_ROOT"
tmux new-session -d -s $SESSION_NAME

# 4. Rename window 0 to STUDENT and create window 1 for TUTOR
echo "Creating 2-window layout (STUDENT + TUTOR)..."
tmux rename-window -t $SESSION_NAME:0 "STUDENT"
tmux new-window -t $SESSION_NAME:1 -n "TUTOR"

# 5. Resize windows
echo "Resizing windows to ${WINDOW_WIDTH}x${WINDOW_HEIGHT}..."
tmux resize-window -t $SESSION_NAME -x $WINDOW_WIDTH -y $WINDOW_HEIGHT

# 5b. Hide tmux status bar (student sees terminal via web browser, not tmux chrome)
tmux set -t $SESSION_NAME status off

# 6. Set pane titles and role names (each window has 1 pane: .0)
tmux select-pane -t $SESSION_NAME:0.0 -T "STUDENT"
tmux select-pane -t $SESSION_NAME:1.0 -T "TUTOR"

tmux set-option -p -t $SESSION_NAME:0.0 @role_name "STUDENT"
tmux set-option -p -t $SESSION_NAME:1.0 @role_name "TUTOR"

# 7. Get pane IDs
echo "Getting pane IDs..."
STUDENT_PANE=$(tmux list-panes -t $SESSION_NAME:0 -F "#{pane_id}" | head -1)
TUTOR_PANE=$(tmux list-panes -t $SESSION_NAME:1 -F "#{pane_id}" | head -1)

echo "Pane IDs:"
echo "  STUDENT (Window 0): $STUDENT_PANE"
echo "  TUTOR   (Window 1): $TUTOR_PANE"

# 7b. Create linked sessions for independent terminal viewing
echo "Creating linked sessions..."
tmux new-session -d -s guided_student -t $SESSION_NAME
tmux new-session -d -s guided_tutor -t $SESSION_NAME

# Select the appropriate window in each linked session
tmux select-window -t guided_student:0
tmux select-window -t guided_tutor:1

# Hide status bar in linked sessions too
tmux set -t guided_student status off
tmux set -t guided_tutor status off

# 8. Verify tm-send is installed
echo "Verifying tm-send installation..."
if command -v tm-send > /dev/null 2>&1; then
    echo "tm-send is installed at: $(which tm-send)"
else
    echo ""
    echo "ERROR: tm-send is not installed!"
    echo ""
    echo "tm-send is a GLOBAL tool that must be installed to ~/.local/bin/tm-send"
    echo "It is NOT project-specific - one installation serves all projects."
    echo ""
    echo "Please install tm-send first before running this script."
    echo ""
    tmux kill-session -t $SESSION_NAME
    exit 1
fi

# 9. Prepare tutor prompt with actual pane IDs (resolve into workspace)
echo "Preparing tutor prompt with pane IDs..."
TUTOR_PROMPT_SRC="$PROMPTS_DIR/TUTOR_PROMPT.md"
TUTOR_PROMPT_DST="$TUTOR_WORKSPACE/prompts/.TUTOR_PROMPT_RESOLVED.md"

if [ ! -f "$TUTOR_PROMPT_SRC" ]; then
    echo "ERROR: Tutor prompt not found at $TUTOR_PROMPT_SRC"
    tmux kill-session -t $SESSION_NAME
    exit 1
fi

# Create resolved copy with actual pane IDs in workspace
cp "$TUTOR_PROMPT_SRC" "$TUTOR_PROMPT_DST"
sed -i "s|\${STUDENT_PANE}|$STUDENT_PANE|g" "$TUTOR_PROMPT_DST"
sed -i "s|\${TUTOR_PANE}|$TUTOR_PANE|g" "$TUTOR_PROMPT_DST"
sed -i "s|\${PROJECT_ROOT}|$PROJECT_ROOT|g" "$TUTOR_PROMPT_DST"

# 9b. Copy curriculum to workspace
echo "Copying curriculum to workspace..."
cp "$PROMPTS_DIR/CURRICULUM.md" "$TUTOR_WORKSPACE/prompts/CURRICULUM.md" 2>/dev/null || true

# 10. Start panes
# STUDENT pane: bash in tutor workspace (student's practice area)
echo "Setting up STUDENT pane (bash)..."
tmux send-keys -t $SESSION_NAME:0.0 "cd $TUTOR_WORKSPACE" C-m

# TUTOR pane (window 1): Claude Code in workspace (isolated from global CLAUDE.md)
# Use CLAUDE_CONFIG_DIR to prevent reading ~/.claude/CLAUDE.md (which has SSH/MacBook stuff)
echo "Setting up isolated Claude config for tutor..."
TUTOR_CLAUDE_CONFIG="$TUTOR_WORKSPACE/.claude-config"
mkdir -p "$TUTOR_CLAUDE_CONFIG/commands"
# Copy only essential global config (no CLAUDE.md)
cp ~/.claude/settings.json "$TUTOR_CLAUDE_CONFIG/settings.json" 2>/dev/null || true
# Copy /ecp command so tutor can load prompts
cp ~/.claude/commands/ecp.md "$TUTOR_CLAUDE_CONFIG/commands/" 2>/dev/null || true
echo "Starting Claude Code in TUTOR pane..."
tmux send-keys -t $SESSION_NAME:1.0 "cd $TUTOR_WORKSPACE && unset CLAUDECODE && CLAUDE_CONFIG_DIR=$TUTOR_CLAUDE_CONFIG claude" C-m

# 11. Wait for Claude Code to start
echo "Waiting for Claude Code to start (15 seconds)..."
sleep 15

# 12. Send tutor prompt to TUTOR window (relative to workspace)
echo "Loading tutor prompt into TUTOR pane..."
tmux send-keys -t $SESSION_NAME:1.0 "/ecp prompts/.TUTOR_PROMPT_RESOLVED.md" C-m

# 13. Wait for prompt to load
echo "Waiting for tutor prompt to load (5 seconds)..."
sleep 5

# Send enter to confirm
tmux send-keys -t $SESSION_NAME:1.0 C-m

# 14. Select STUDENT window in base session (default view)
tmux select-window -t $SESSION_NAME:0

# 15. Clear student pane (removes tmux attach handshake junk)
sleep 1
tmux send-keys -t $SESSION_NAME:0.0 "clear" C-m

echo ""
echo "=========================================="
echo "Guided AI Coding Team Setup Complete!"
echo "=========================================="
echo ""
echo "Session: $SESSION_NAME (base) + guided_student + guided_tutor (linked)"
echo "Project: $PROJECT_ROOT"
echo "Tutor workspace: $TUTOR_WORKSPACE"
echo ""
echo "Roles:"
echo "  STUDENT (Window 0): $STUDENT_PANE — Student's bash (accessed via web terminal)"
echo "  TUTOR   (Window 1): $TUTOR_PANE — AI tutor (Claude Code in ~/tutor-workspace)"
echo ""
echo "To attach independently:"
echo "  tmux attach -t guided_student   # See STUDENT window"
echo "  tmux attach -t guided_tutor     # See TUTOR window"
echo ""
echo "Communication (from outside tmux):"
echo "  tm-send -s $SESSION_NAME TUTOR \"your message\""
echo "  tm-send -s $SESSION_NAME STUDENT \"your message\""
echo ""
echo "=========================================="
