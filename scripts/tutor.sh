#!/bin/bash
# tutor — CLI for managing the Guided AI Coding application
# Usage: tutor <command>
# Commands: install, start, stop, reset, update, status

set -eo pipefail

# Resolve symlinks to find real script location (macOS-compatible)
SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
    DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PID_FILE="$HOME/.tutor.pids"
SESSION_NAME="guided_ai_coding"
TUTOR_WORKSPACE="$HOME/tutor-workspace"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[tutor]${NC} $1"; }
success() { echo -e "${GREEN}[tutor]${NC} $1"; }
warn()    { echo -e "${YELLOW}[tutor]${NC} $1"; }
error()   { echo -e "${RED}[tutor]${NC} $1" >&2; }

# ─── install ─────────────────────────────────────────────────────────
cmd_install() {
    log "Checking prerequisites..."
    local missing=()
    for cmd in node pnpm uv tmux tm-send; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done
    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing: ${missing[*]}"
        echo "  Install them before running 'tutor install'."
        exit 1
    fi

    log "Installing backend dependencies..."
    (cd "$PROJECT_ROOT/backend" && uv sync)

    log "Installing terminal service dependencies..."
    (cd "$PROJECT_ROOT/terminal-service" && npm install)

    log "Installing frontend dependencies..."
    (cd "$PROJECT_ROOT/frontend" && pnpm install)

    log "Building frontend for production..."
    (cd "$PROJECT_ROOT/frontend" && pnpm build)

    # Symlink to /usr/local/bin/tutor
    local target="$PROJECT_ROOT/scripts/tutor.sh"
    local link="/usr/local/bin/tutor"
    if [ ! -L "$link" ] || [ "$(readlink "$link")" != "$target" ]; then
        log "Symlinking $link → $target"
        sudo ln -sf "$target" "$link"
    else
        log "Symlink already exists"
    fi

    success "Install complete! Run 'tutor start' to launch."
}

# ─── stop ────────────────────────────────────────────────────────────
cmd_stop() {
    log "Stopping services..."

    # Kill tracked PIDs
    if [ -f "$PID_FILE" ]; then
        while IFS= read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
                log "Killed PID $pid"
            fi
        done < "$PID_FILE"

        # Wait for tracked PIDs to actually exit
        local wait_count=0
        while [ $wait_count -lt 10 ]; do
            local any_alive=false
            while IFS= read -r pid; do
                kill -0 "$pid" 2>/dev/null && any_alive=true && break
            done < "$PID_FILE"
            if ! $any_alive; then break; fi
            sleep 0.5
            wait_count=$((wait_count + 1))
        done
        # Force-kill stragglers
        if [ $wait_count -ge 10 ]; then
            while IFS= read -r pid; do
                kill -9 "$pid" 2>/dev/null || true
            done < "$PID_FILE"
            warn "Force-killed stubborn processes"
        fi

        rm -f "$PID_FILE"
    fi

    # Kill any leftover processes on our ports
    for port in 17066 17076 3343; do
        local pids
        pids=$(lsof -ti ":$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill 2>/dev/null || true
            log "Killed process(es) on port $port"
        fi
    done

    # Wait for ports to be free
    local port_wait=0
    while [ $port_wait -lt 10 ]; do
        local ports_free=true
        for port in 17066 17076 3343; do
            lsof -ti ":$port" &>/dev/null && ports_free=false && break
        done
        if $ports_free; then break; fi
        sleep 0.5
        port_wait=$((port_wait + 1))
    done
    if [ $port_wait -ge 10 ]; then
        for port in 17066 17076 3343; do
            lsof -ti ":$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
        done
        warn "Force-killed processes holding ports"
    fi

    # Kill tmux session
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux kill-session -t "$SESSION_NAME"
        log "Killed tmux session"
    fi

    success "Stopped."
}

# ─── start ───────────────────────────────────────────────────────────
cmd_start() {
    # Clean up on interrupt (prevent orphaned background services)
    trap 'warn "Interrupted — cleaning up..."; cmd_stop; exit 130' INT TERM

    # Stop existing services first (idempotent)
    cmd_stop

    # Check frontend is built
    if [ ! -d "$PROJECT_ROOT/frontend/.next" ]; then
        error "Frontend not built. Run 'tutor install' first."
        exit 1
    fi

    # Create tmux session + tutor panes (TUTOR_FORCE skips interactive prompt)
    log "Setting up tmux session..."
    TUTOR_FORCE=1 bash "$PROJECT_ROOT/scripts/setup-tutor.sh"

    # Set up .env files (API keys from ~/dev/.env)
    log "Configuring environment..."
    rm -f "$PROJECT_ROOT/frontend/.env.local" "$PROJECT_ROOT/backend/.env"
    if [ -f ~/dev/.env ]; then
        grep "^XAI_API_KEY=" ~/dev/.env >> "$PROJECT_ROOT/backend/.env" 2>/dev/null || true
        local soniox_key
        soniox_key=$(grep "^SONIOX_API_KEY=" ~/dev/.env | cut -d= -f2 || true)
        [ -n "$soniox_key" ] && echo "NEXT_PUBLIC_SONIOX_API_KEY=$soniox_key" >> "$PROJECT_ROOT/frontend/.env.local"
    fi

    # Start backend (production — no --reload)
    log "Starting backend (port 17066)..."
    (cd "$PROJECT_ROOT/backend" && exec uv run uvicorn app.main:app --host 0.0.0.0 --port 17066) &
    echo $! >> "$PID_FILE"

    # Start terminal service
    log "Starting terminal service (port 17076)..."
    (cd "$PROJECT_ROOT/terminal-service" && exec node server.js) &
    echo $! >> "$PID_FILE"

    # Start frontend (production server)
    log "Starting frontend (port 3343)..."
    (cd "$PROJECT_ROOT/frontend" && exec ./node_modules/.bin/next start -p 3343) &
    echo $! >> "$PID_FILE"

    # Wait for all ports to respond
    log "Waiting for services..."
    local retries=0
    while [ $retries -lt 30 ]; do
        local all_up=true
        for port in 17066 17076 3343; do
            if ! lsof -i ":$port" -sTCP:LISTEN &>/dev/null; then
                all_up=false
                break
            fi
        done
        if $all_up; then break; fi
        sleep 1
        retries=$((retries + 1))
    done

    if [ $retries -ge 30 ]; then
        warn "Some services may not have started. Run 'tutor status' to check."
    else
        success "Ready at http://localhost:3343"
    fi

    # Services are up — clear interrupt trap (don't auto-kill on future signals)
    trap - INT TERM
}

# ─── reset ───────────────────────────────────────────────────────────
cmd_reset() {
    cmd_stop

    log "Wiping tutor memory..."
    rm -f "$TUTOR_WORKSPACE/memory/"*.md

    # Re-copy fresh memory from project
    if [ -d "$PROJECT_ROOT/tutor/memory" ]; then
        log "Restoring fresh memory..."
        mkdir -p "$TUTOR_WORKSPACE/memory"
        cp "$PROJECT_ROOT/tutor/memory/"*.md "$TUTOR_WORKSPACE/memory/" 2>/dev/null || true
    fi

    cmd_start
    success "Reset complete — tutor starts from lesson 1"
}

# ─── update ──────────────────────────────────────────────────────────
cmd_update() {
    cmd_stop

    log "Pulling latest code..."
    (cd "$PROJECT_ROOT" && git pull)

    cmd_install
    cmd_start
}

# ─── status ──────────────────────────────────────────────────────────
cmd_status() {
    echo ""
    echo "  Guided AI Coding — Status"
    echo "  ─────────────────────────"

    # Tmux session
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo -e "  tmux session:  ${GREEN}running${NC}"
    else
        echo -e "  tmux session:  ${RED}stopped${NC}"
    fi

    # Service ports
    for pair in "Frontend:3343" "Backend:17066" "Terminal:17076"; do
        local name="${pair%%:*}"
        local port="${pair##*:}"
        local pad=$((15 - ${#name}))
        if lsof -i ":$port" -sTCP:LISTEN &>/dev/null; then
            echo -e "  ${name}:$(printf '%*s' "$pad" '')${GREEN}listening${NC} on :${port}"
        else
            echo -e "  ${name}:$(printf '%*s' "$pad" '')${RED}not running${NC}"
        fi
    done

    # PID health
    if [ -f "$PID_FILE" ]; then
        local alive=0 total=0
        while IFS= read -r pid; do
            total=$((total + 1))
            kill -0 "$pid" 2>/dev/null && alive=$((alive + 1))
        done < "$PID_FILE"
        echo "  PIDs:          $alive/$total alive"
    fi
    echo ""
}

# ─── main ────────────────────────────────────────────────────────────
case "${1:-}" in
    install) cmd_install ;;
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    reset)   cmd_reset ;;
    update)  cmd_update ;;
    status)  cmd_status ;;
    *)
        echo "Usage: tutor <command>"
        echo ""
        echo "Commands:"
        echo "  install   Install deps + build frontend"
        echo "  start     Start (or restart) all services"
        echo "  stop      Stop all services"
        echo "  reset     Wipe tutor memory + restart"
        echo "  update    Git pull + reinstall + restart"
        echo "  status    Show service health"
        ;;
esac
