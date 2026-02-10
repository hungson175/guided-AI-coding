#!/bin/bash
# Start services in PROD mode (remote debugging via Vietnix tunnel)
# Frontend calls backend via Vietnix public IP
# Tunnels managed by systemd (ssh-tunnel-gac-frontend, ssh-tunnel-gac-backend)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VIETNIX_IP="14.225.192.6"

echo "Starting services in PROD mode (Vietnix: $VIETNIX_IP)..."
echo ""

# Set frontend to call backend and terminal via Vietnix public IP
cat > "$PROJECT_ROOT/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://$VIETNIX_IP:17066
NEXT_PUBLIC_TERMINAL_WS_URL=http://$VIETNIX_IP:17076
EOF

# Set backend CORS to allow both local and Vietnix origins
mkdir -p "$PROJECT_ROOT/backend"
cat > "$PROJECT_ROOT/backend/.env" <<EOF
CORS_ORIGINS=http://localhost:3343,http://$VIETNIX_IP:3343
EOF

# Ensure tunnel services are running
systemctl --user start ssh-tunnel-gac-frontend.service ssh-tunnel-gac-backend.service ssh-tunnel-gac-terminal.service 2>/dev/null

# Start backend
cd "$PROJECT_ROOT/backend" && uv run uvicorn app.main:app --host 0.0.0.0 --port 17066 --reload &

# Start terminal service
cd "$PROJECT_ROOT/terminal-service" && node server.js &

# Start frontend
cd "$PROJECT_ROOT/frontend" && pnpm dev &

echo ""
echo "PROD mode ready!"
echo "  Local:    http://localhost:3343"
echo "  Remote:   http://$VIETNIX_IP:3343"
echo "  Backend:  http://$VIETNIX_IP:17066"
echo "  Terminal: http://$VIETNIX_IP:17076"
echo "  Tunnels:  systemctl --user status ssh-tunnel-gac-frontend ssh-tunnel-gac-backend"
