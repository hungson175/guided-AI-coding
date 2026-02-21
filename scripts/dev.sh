#!/bin/bash
# Start services in DEV mode (local development)
# Backend: localhost:17066, Terminal: localhost:17076, Frontend: localhost:3343
# No tunnels, no remote access

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting services in DEV mode..."
echo ""

# Set up env files with API keys from ~/dev/.env
rm -f "$PROJECT_ROOT/frontend/.env.local"
rm -f "$PROJECT_ROOT/backend/.env"
if [ -f ~/dev/.env ]; then
  grep "^XAI_API_KEY=" ~/dev/.env >> "$PROJECT_ROOT/backend/.env" 2>/dev/null
  SONIOX_KEY=$(grep "^SONIOX_API_KEY=" ~/dev/.env | cut -d= -f2)
  [ -n "$SONIOX_KEY" ] && echo "NEXT_PUBLIC_SONIOX_API_KEY=$SONIOX_KEY" >> "$PROJECT_ROOT/frontend/.env.local"
fi

# Start backend (load_dotenv() in main.py reads .env)
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
