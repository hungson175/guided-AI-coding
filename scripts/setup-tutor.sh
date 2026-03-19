#!/bin/bash

# Guided AI Coding — Tmux Session Setup (simplified: tmux-only, no web app)
# Creates a tmux session with 2 panes: STUDENT (left) + TUTOR (right)
# Student works in ~/tutor-workspace, tutor runs Claude Code with tutor prompt

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="guided_ai_coding"
PROMPTS_DIR="$PROJECT_ROOT/prompts"
WORKSPACE="$PROJECT_ROOT/tutor-workspace"

echo "Starting Guided AI Coding Setup..."
echo "Project Root: $PROJECT_ROOT"
echo "Workspace: $WORKSPACE"

# ── Preflight checks ─────────────────────────────────────────────
if ! command -v tmux &>/dev/null; then
    echo "Error: tmux is not installed."
    echo "  brew install tmux    # macOS"
    echo "  sudo apt install tmux  # Linux"
    exit 1
fi

if ! command -v claude &>/dev/null; then
    echo "Error: claude (Claude Code CLI) is not installed."
    echo "  npm install -g @anthropic-ai/claude-code"
    exit 1
fi

if [ ! -f "$PROMPTS_DIR/TUTOR_PROMPT.md" ]; then
    echo "Error: Tutor prompt not found at $PROMPTS_DIR/TUTOR_PROMPT.md"
    exit 1
fi

# ── Kill existing session if any ──────────────────────────────────
if tmux has-session -t "$SESSION" 2>/dev/null; then
    if [ "${TUTOR_FORCE:-0}" = "1" ]; then
        tmux kill-session -t "$SESSION"
        echo "Killed existing session (TUTOR_FORCE=1)"
    else
        echo "Session '$SESSION' already exists. Killing it..."
        tmux kill-session -t "$SESSION"
    fi
fi

# ── Provision workspace ──────────────────────────────────────────
mkdir -p "$WORKSPACE"/{prompts,memory,projects,.claude/hooks}

# Copy curriculum and prompt to workspace
cp "$PROMPTS_DIR/CURRICULUM.md" "$WORKSPACE/prompts/CURRICULUM.md"

# Resolve tutor prompt with pane placeholder (will be updated after session creation)
cp "$PROMPTS_DIR/TUTOR_PROMPT.md" "$WORKSPACE/prompts/.TUTOR_PROMPT_RESOLVED.md"

# Copy hook script and settings for session-start re-injection
cp "$PROJECT_ROOT/scripts/tutor-hooks/session_start_tutor.py" "$WORKSPACE/.claude/hooks/"
chmod +x "$WORKSPACE/.claude/hooks/session_start_tutor.py"
cp "$PROJECT_ROOT/scripts/tutor-hooks/settings.json" "$WORKSPACE/.claude/settings.json"

# ── Build the tmux session ────────────────────────────────────────
echo "Creating tmux session '$SESSION'..."
tmux new-session -d -s "$SESSION" -c "$WORKSPACE" -x 200 -y 50

# Get the student pane ID (pane 0)
STUDENT_PANE=$(tmux list-panes -t "$SESSION:0" -F "#{pane_id}" | head -1)

# Student pane: welcome message
tmux send-keys -t "$SESSION:0.0" "clear && printf '\\n  Chào mừng! Đây là terminal của bạn.\\n  Tutor ở bên phải -->\\n  Gõ lệnh ở đây. Thí nghiệm thoải mái!\\n\\n'" Enter

# Split: right pane for the tutor (40% width)
tmux split-window -h -t "$SESSION:0.0" -c "$WORKSPACE" -p 40

# Get the tutor pane ID
TUTOR_PANE=$(tmux list-panes -t "$SESSION:0" -F "#{pane_id}" | tail -1)

echo "Pane IDs: STUDENT=$STUDENT_PANE, TUTOR=$TUTOR_PANE"

# ── Resolve prompt with actual pane IDs ──────────────────────────
RESOLVED="$WORKSPACE/prompts/.TUTOR_PROMPT_RESOLVED.md"
sed -i '' "s|\${STUDENT_PANE}|$STUDENT_PANE|g" "$RESOLVED"
sed -i '' "s|\${TUTOR_PANE}|$TUTOR_PANE|g" "$RESOLVED"
sed -i '' "s|\${PROJECT_ROOT}|$PROJECT_ROOT|g" "$RESOLVED"

# ── Launch Claude Code in the tutor pane ──────────────────────────
# Use isolated config to avoid loading boss's global CLAUDE.md
TUTOR_CLAUDE_CONFIG="$WORKSPACE/.claude-config"
mkdir -p "$TUTOR_CLAUDE_CONFIG/commands"
cp ~/.claude/settings.json "$TUTOR_CLAUDE_CONFIG/settings.json" 2>/dev/null || true
cp ~/.claude/commands/ecp.md "$TUTOR_CLAUDE_CONFIG/commands/" 2>/dev/null || true

echo "Starting Claude Code in tutor pane..."
tmux send-keys -t "$SESSION:0.1" "cd $WORKSPACE && CLAUDE_CONFIG_DIR=$TUTOR_CLAUDE_CONFIG claude" C-m

# Wait for Claude Code to start
echo "Waiting for Claude Code to start (15 seconds)..."
sleep 15

# Load tutor prompt
echo "Loading tutor prompt..."
tmux send-keys -t "$SESSION:0.1" "/ecp prompts/.TUTOR_PROMPT_RESOLVED.md" C-m
sleep 5
tmux send-keys -t "$SESSION:0.1" C-m

# Focus the student pane (left)
tmux select-pane -t "$SESSION:0.0"

# Clear student pane
sleep 1
tmux send-keys -t "$SESSION:0.0" "clear" C-m

# ── Attach ────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  Guided AI Coding — Ready!"
echo "=========================================="
echo ""
echo "  Left pane:  Student terminal (type here)"
echo "  Right pane: AI Tutor (Claude Code)"
echo "  Workspace:  $WORKSPACE"
echo ""
echo "  To reattach: tmux attach -t $SESSION"
echo ""
echo "  Communication from outside:"
echo "    tm-send -s $SESSION TUTOR \"your message\""
echo ""
echo "=========================================="

tmux attach-session -t "$SESSION"
