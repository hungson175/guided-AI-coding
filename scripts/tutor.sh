#!/bin/bash
# Guided AI Coding — Tutor Manager
# Usage: tutor [install|start|stop|restart|reset|update|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SESSION_NAME="guided_ai_coding"
TUTOR_WORKSPACE="$HOME/tutor-workspace"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[tutor]${NC} $1"; }
warn() { echo -e "${YELLOW}[tutor]${NC} $1"; }
err()  { echo -e "${RED}[tutor]${NC} $1"; }

# ──────────────────────────────────────────────
# STOP — kill services and tmux session
# ──────────────────────────────────────────────
do_stop() {
    log "Stopping services..."

    # Kill web services by port
    for PORT in 3343 17066 17076; do
        PID=$(lsof -ti :$PORT 2>/dev/null || true)
        if [ -n "$PID" ]; then
            kill -9 $PID 2>/dev/null || true
            log "  Killed process on port $PORT"
        fi
    done

    # Fallback: kill by process name
    pkill -f "next dev --port 3343" 2>/dev/null || true
    pkill -f "pnpm dev" 2>/dev/null || true
    pkill -f "uvicorn app.main:app.*17066" 2>/dev/null || true
    pkill -f "node server.js" 2>/dev/null || true

    # Kill linked sessions first, then base session
    tmux kill-session -t guided_student 2>/dev/null && log "  Killed linked session guided_student" || true
    tmux kill-session -t guided_tutor 2>/dev/null && log "  Killed linked session guided_tutor" || true
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        tmux kill-session -t $SESSION_NAME
        log "  Killed tmux session"
    fi

    sleep 1
    log "Stopped."
}

# ──────────────────────────────────────────────
# START — setup tmux + start services
# ──────────────────────────────────────────────
do_start() {
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        warn "Already running. Use 'tutor restart' or 'tutor stop' first."
        return 1
    fi

    log "Starting Guided AI Coding..."

    # Setup tmux session (auto-confirm if exists)
    log "Setting up tmux session..."
    bash "$SCRIPT_DIR/setup-tutor.sh" <<< "y"

    # Start web services
    log "Starting web services..."
    bash "$SCRIPT_DIR/dev.sh" &
    sleep 5

    do_status
    echo ""
    log "Open browser: http://localhost:3343"
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
# RESET — full clean slate (clears tutor memory)
# ──────────────────────────────────────────────
do_reset() {
    warn "This will DELETE tutor memory and start fresh."
    read -p "Are you sure? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Aborted."
        return 0
    fi

    do_stop

    if [ -d "$TUTOR_WORKSPACE" ]; then
        # Preserve Claude Code credentials across reset (OAuth tokens are config-dir-bound)
        CREDS_BACKUP=""
        CREDS_FILE="$TUTOR_WORKSPACE/.claude-config/.credentials.json"
        if [ -f "$CREDS_FILE" ]; then
            CREDS_BACKUP=$(mktemp)
            cp "$CREDS_FILE" "$CREDS_BACKUP"
            log "Backed up tutor credentials"
        fi

        log "Clearing tutor workspace: $TUTOR_WORKSPACE"
        rm -rf "$TUTOR_WORKSPACE"

        # Restore credentials into the dir that setup-tutor.sh will create
        if [ -n "$CREDS_BACKUP" ]; then
            mkdir -p "$TUTOR_WORKSPACE/.claude-config"
            mv "$CREDS_BACKUP" "$TUTOR_WORKSPACE/.claude-config/.credentials.json"
            log "Restored tutor credentials"
        fi
    fi

    sleep 2
    do_start
    log "Reset complete. Tutor starts fresh."
}

# ──────────────────────────────────────────────
# UPDATE — pull from GitHub, reinstall deps, restart
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

    # Reinstall dependencies
    log "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend" && uv sync 2>&1 | tail -3

    log "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend" && npm install --legacy-peer-deps 2>&1 | tail -3

    log "Installing terminal-service dependencies..."
    cd "$PROJECT_ROOT/terminal-service" && npm install 2>&1 | tail -3

    # Restart if currently running
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        do_stop
        sleep 2
        do_start
    fi

    log "Update complete."
}

# ──────────────────────────────────────────────
# INSTALL — first-time setup (deps + symlink)
# ──────────────────────────────────────────────
do_install() {
    log "Installing Guided AI Coding..."

    # Check prerequisites
    for CMD in tmux node uv git; do
        if ! command -v $CMD &>/dev/null; then
            err "Missing prerequisite: $CMD"
            exit 1
        fi
    done

    if ! command -v tm-send &>/dev/null; then
        err "Missing prerequisite: tm-send (install to ~/.local/bin/tm-send)"
        exit 1
    fi

    # Install backend dependencies
    log "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend" && uv sync 2>&1 | tail -3

    # Install frontend dependencies
    log "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend" && npm install --legacy-peer-deps 2>&1 | tail -3

    # Install terminal-service dependencies
    log "Installing terminal-service dependencies..."
    cd "$PROJECT_ROOT/terminal-service" && npm install 2>&1 | tail -3

    # Create symlink so 'tutor' works globally
    SYMLINK_PATH="$HOME/.local/bin/tutor"
    mkdir -p "$HOME/.local/bin"
    ln -sf "$SCRIPT_DIR/tutor.sh" "$SYMLINK_PATH"
    log "Created symlink: $SYMLINK_PATH -> tutor.sh"

    # Verify ~/.local/bin is in PATH
    if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
        warn "Add ~/.local/bin to your PATH:"
        warn '  echo '\''export PATH="$HOME/.local/bin:$PATH"'\'' >> ~/.bashrc && source ~/.bashrc'
    fi

    echo ""
    log "Install complete! Commands:"
    log "  tutor start    — Start the app"
    log "  tutor stop     — Stop everything"
    log "  tutor restart  — Restart (keeps memory)"
    log "  tutor reset    — Full reset (clears memory)"
    log "  tutor update   — Pull updates from GitHub"
    log "  tutor status   — Check what's running"
}

# ──────────────────────────────────────────────
# STATUS — show what's running
# ──────────────────────────────────────────────
do_status() {
    echo ""
    log "=== Status ==="

    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        echo -e "  Tmux session:    ${GREEN}running${NC}"
    else
        echo -e "  Tmux session:    ${RED}stopped${NC}"
    fi

    for PAIR in "3343:Frontend" "17066:Backend" "17076:Terminal"; do
        PORT="${PAIR%%:*}"
        NAME="${PAIR##*:}"
        if ss -tlnp 2>/dev/null | grep -q ":$PORT " ; then
            echo -e "  $NAME ($PORT): ${GREEN}running${NC}"
        else
            echo -e "  $NAME ($PORT): ${RED}stopped${NC}"
        fi
    done

    COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo "  Git commit:      $COMMIT"
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
        echo "  install  First-time setup (install deps + create 'tutor' command)"
        echo "  start    Start tmux session + all services"
        echo "  stop     Stop everything"
        echo "  restart  Stop then start (keeps tutor memory)"
        echo "  reset    Full reset (clears tutor memory, fresh start)"
        echo "  update   Pull latest from GitHub, reinstall deps"
        echo "  status   Show what's running"
        ;;
esac
