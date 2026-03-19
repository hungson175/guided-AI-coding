#!/bin/bash
# Guided AI Coding — Tutor Manager
# Usage: tutor [install|start|stop|restart|reset|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SESSION_NAME="guided_ai_coding"
WORKSPACE="$PROJECT_ROOT/tutor-workspace"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[tutor]${NC} $1"; }
warn() { echo -e "${YELLOW}[tutor]${NC} $1"; }
err()  { echo -e "${RED}[tutor]${NC} $1"; }

# ──────────────────────────────────────────────
# STOP — kill tmux session
# ──────────────────────────────────────────────
do_stop() {
    log "Stopping..."

    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        tmux kill-session -t $SESSION_NAME
        log "Killed tmux session"
    else
        log "Not running."
    fi
}

# ──────────────────────────────────────────────
# START — setup tmux session
# ──────────────────────────────────────────────
do_start() {
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        warn "Already running. Use 'tutor restart' or 'tutor stop' first."
        warn "To reattach: tmux attach -t $SESSION_NAME"
        return 1
    fi

    log "Starting Guided AI Coding..."
    TUTOR_FORCE=1 bash "$SCRIPT_DIR/setup-tutor.sh"
}

# ──────────────────────────────────────────────
# RESTART — stop + start (preserves tutor memory)
# ──────────────────────────────────────────────
do_restart() {
    log "Restarting..."
    do_stop
    sleep 2
    do_start
}

# ──────────────────────────────────────────────
# RESET — clear tutor memory, fresh start
# ──────────────────────────────────────────────
do_reset() {
    warn "This will DELETE tutor memory and start fresh."
    warn "(Student projects are preserved.)"
    read -p "Are you sure? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Aborted."
        return 0
    fi

    do_stop

    # Clear memory only, preserve projects and prompts
    if [ -d "$WORKSPACE/memory" ]; then
        log "Clearing tutor memory..."
        rm -rf "$WORKSPACE/memory"
        mkdir -p "$WORKSPACE/memory"
    fi

    sleep 2
    do_start
    log "Reset complete. Tutor starts fresh."
}

# ──────────────────────────────────────────────
# UPDATE — pull from GitHub, restart
# ──────────────────────────────────────────────
do_update() {
    log "Checking for updates..."

    OLD_COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)
    git -C "$PROJECT_ROOT" pull --ff-only
    NEW_COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)

    if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
        log "Already up to date ($OLD_COMMIT)."
        return 0
    fi

    log "Updated: $OLD_COMMIT -> $NEW_COMMIT"

    # Restart if currently running
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        do_restart
    fi

    log "Update complete."
}

# ──────────────────────────────────────────────
# INSTALL — first-time setup (symlink only)
# ──────────────────────────────────────────────
do_install() {
    log "Installing Guided AI Coding..."

    # Check prerequisites
    for CMD in tmux claude; do
        if ! command -v $CMD &>/dev/null; then
            err "Missing prerequisite: $CMD"
            case $CMD in
                tmux)  echo "  brew install tmux" ;;
                claude) echo "  npm install -g @anthropic-ai/claude-code" ;;
            esac
            exit 1
        fi
    done

    # Create symlink so 'tutor' works globally
    SYMLINK_PATH="$HOME/.local/bin/tutor"
    mkdir -p "$HOME/.local/bin"
    ln -sf "$SCRIPT_DIR/tutor.sh" "$SYMLINK_PATH"
    log "Created symlink: $SYMLINK_PATH -> tutor.sh"

    # Verify ~/.local/bin is in PATH
    if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
        warn "Add ~/.local/bin to your PATH:"
        warn '  echo '\''export PATH="$HOME/.local/bin:$PATH"'\'' >> ~/.zshrc && source ~/.zshrc'
    fi

    echo ""
    log "Install complete! Commands:"
    log "  tutor start    — Start the tutor session"
    log "  tutor stop     — Stop the session"
    log "  tutor restart  — Restart (keeps memory)"
    log "  tutor reset    — Fresh start (clears memory, keeps projects)"
    log "  tutor update   — Pull updates from GitHub"
    log "  tutor status   — Check if running"
}

# ──────────────────────────────────────────────
# STATUS — show what's running
# ──────────────────────────────────────────────
do_status() {
    echo ""
    log "=== Status ==="

    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        echo -e "  Tmux session:  ${GREEN}running${NC}"
        echo "  Reattach:      tmux attach -t $SESSION_NAME"
    else
        echo -e "  Tmux session:  ${RED}stopped${NC}"
        echo "  Start:         tutor start"
    fi

    if [ -f "$WORKSPACE/memory/progress.md" ]; then
        LESSON=$(grep -m1 "Lesson:" "$WORKSPACE/memory/progress.md" 2>/dev/null || echo "unknown")
        echo "  Progress:      $LESSON"
    else
        echo "  Progress:      (new student)"
    fi

    COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo "  Git commit:    $COMMIT"
    echo ""
}

# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
CMD="${1:-help}"

case "$CMD" in
    install) do_install ;;
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_restart ;;
    reset)   do_reset ;;
    update)  do_update ;;
    status)  do_status ;;
    *)
        echo "Guided AI Coding — Tutor Manager"
        echo ""
        echo "Usage: tutor [command]"
        echo ""
        echo "Commands:"
        echo "  install  First-time setup (create 'tutor' command)"
        echo "  start    Start the tutor tmux session"
        echo "  stop     Stop the session"
        echo "  restart  Restart (keeps tutor memory)"
        echo "  reset    Clear tutor memory, fresh start (keeps projects)"
        echo "  update   Pull latest from GitHub"
        echo "  status   Check if running"
        ;;
esac
