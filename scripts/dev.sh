#!/bin/bash
# Start services in DEV mode (local development)
# Backend: localhost:17066, Terminal: localhost:17076, Frontend: localhost:3343
# No tunnels, no remote access

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting services in DEV mode..."
echo ""

# Clear any prod env overrides
rm -f "$PROJECT_ROOT/frontend/.env.local"
rm -f "$PROJECT_ROOT/backend/.env"

# Start backend
cd "$PROJECT_ROOT/backend" && uv run uvicorn app.main:app --host 0.0.0.0 --port 17066 --reload &

# Start terminal service
cd "$PROJECT_ROOT/terminal-service" && node server.js &

# Start frontend
cd "$PROJECT_ROOT/frontend" && pnpm dev &

echo ""
echo "DEV mode ready!"
echo "  Backend:  http://localhost:17066"
echo "  Terminal: http://localhost:17076"
echo "  Frontend: http://localhost:3343"
