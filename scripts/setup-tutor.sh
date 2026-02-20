#!/bin/bash

# Guided AI Coding — Tmux Team Setup
# Creates a tmux session with 2 Claude Code instances (STUDENT 70%, TUTOR 30%)

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="guided_ai_coding"
PROMPTS_DIR="$PROJECT_ROOT/prompts"

# Window sizing
WINDOW_WIDTH=220
WINDOW_HEIGHT=50

echo "Starting Guided AI Coding Team Setup..."
echo "Project Root: $PROJECT_ROOT"
echo "Session Name: $SESSION_NAME"

# 1. Check if session already exists
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

# 2. Start new tmux session
echo "Creating tmux session '$SESSION_NAME'..."
cd "$PROJECT_ROOT"
tmux new-session -d -s $SESSION_NAME

# 3. Create 2-pane layout (70/30 split)
echo "Creating 2-pane layout (70/30)..."
tmux split-window -h -p 30 -t $SESSION_NAME

# 4. Resize window
echo "Resizing window to ${WINDOW_WIDTH}x${WINDOW_HEIGHT}..."
tmux resize-window -t $SESSION_NAME -x $WINDOW_WIDTH -y $WINDOW_HEIGHT

# 5. Set pane titles and role names
tmux select-pane -t $SESSION_NAME:0.0 -T "STUDENT"
tmux select-pane -t $SESSION_NAME:0.1 -T "TUTOR"

tmux set-option -p -t $SESSION_NAME:0.0 @role_name "STUDENT"
tmux set-option -p -t $SESSION_NAME:0.1 @role_name "TUTOR"

# 6. Get pane IDs
echo "Getting pane IDs..."
PANE_IDS=$(tmux list-panes -t $SESSION_NAME -F "#{pane_id}")
STUDENT_PANE=$(echo "$PANE_IDS" | sed -n '1p')
TUTOR_PANE=$(echo "$PANE_IDS" | sed -n '2p')

echo "Pane IDs:"
echo "  STUDENT (Pane 0): $STUDENT_PANE"
echo "  TUTOR   (Pane 1): $TUTOR_PANE"

# 7. Verify tm-send is installed
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

# 8. Start Claude Code in both panes
echo "Starting Claude Code instances..."
tmux send-keys -t $SESSION_NAME:0.0 "cd $PROJECT_ROOT && unset CLAUDECODE && claude" C-m
tmux send-keys -t $SESSION_NAME:0.1 "cd $PROJECT_ROOT && unset CLAUDECODE && claude" C-m

# 9. Wait for Claude Code to start
echo "Waiting for Claude Code to start (15 seconds)..."
sleep 15

# 10. Prepare tutor prompt with actual pane IDs
echo "Preparing tutor prompt with pane IDs..."
TUTOR_PROMPT_SRC="$PROMPTS_DIR/TUTOR_PROMPT.md"
TUTOR_PROMPT_TMP="$PROMPTS_DIR/.TUTOR_PROMPT_RESOLVED.md"

if [ ! -f "$TUTOR_PROMPT_SRC" ]; then
    echo "ERROR: Tutor prompt not found at $TUTOR_PROMPT_SRC"
    tmux kill-session -t $SESSION_NAME
    exit 1
fi

# Create resolved copy with actual pane IDs
cp "$TUTOR_PROMPT_SRC" "$TUTOR_PROMPT_TMP"
sed -i "s|\${STUDENT_PANE}|$STUDENT_PANE|g" "$TUTOR_PROMPT_TMP"
sed -i "s|\${TUTOR_PANE}|$TUTOR_PANE|g" "$TUTOR_PROMPT_TMP"
sed -i "s|\${PROJECT_ROOT}|$PROJECT_ROOT|g" "$TUTOR_PROMPT_TMP"

# 11. Send tutor prompt to right pane
echo "Loading tutor prompt into TUTOR pane..."
tmux send-keys -t $SESSION_NAME:0.1 "/ecp prompts/.TUTOR_PROMPT_RESOLVED.md" C-m

# 12. Wait for prompt to load
echo "Waiting for tutor prompt to load (5 seconds)..."
sleep 5

# Send enter to confirm
tmux send-keys -t $SESSION_NAME:0.1 C-m

echo ""
echo "=========================================="
echo "Guided AI Coding Team Setup Complete!"
echo "=========================================="
echo ""
echo "Session: $SESSION_NAME"
echo "Project: $PROJECT_ROOT"
echo ""
echo "Roles:"
echo "  STUDENT (Pane 0, 70%): $STUDENT_PANE — Student's Claude Code workspace"
echo "  TUTOR   (Pane 1, 30%): $TUTOR_PANE — AI tutor (Coach Son)"
echo ""
echo "To attach to the session:"
echo "  tmux attach -t $SESSION_NAME"
echo ""
echo "Communication (from inside the session):"
echo "  Student → Tutor:  tm-send TUTOR \"your message\""
echo "  Tutor → Student:  tm-send STUDENT \"your message\""
echo ""
echo "Communication (from outside tmux):"
echo "  tm-send -s $SESSION_NAME TUTOR \"your message\""
echo "  tm-send -s $SESSION_NAME STUDENT \"your message\""
echo ""
echo "=========================================="
