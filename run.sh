#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [ ! -d "$ROOT/.venv" ]; then
  echo "No existe .venv. Ejecute primero: ./setup.sh" >&2
  exit 1
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "No existe frontend/node_modules. Ejecute primero: ./setup.sh" >&2
  exit 1
fi

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "Falta backend/.env. Ejecute ./setup.sh o copie backend/.env.example." >&2
  exit 1
fi

BACKEND_PID=""
cleanup() {
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# shellcheck source=/dev/null
source "$ROOT/.venv/bin/activate"

DJANGO_PORT="${DJANGO_PORT:-8000}"
VITE_PORT="${VITE_PORT:-5173}"

echo "[run] Migraciones Django"
(cd "$ROOT/backend" && python manage.py migrate --noinput)

echo "[run] Backend http://127.0.0.1:${DJANGO_PORT}"
(cd "$ROOT/backend" && python manage.py runserver "0.0.0.0:${DJANGO_PORT}") &
BACKEND_PID=$!

sleep 1
if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
  echo "[run] El servidor Django no arrancó. Revise MySQL y backend/.env." >&2
  exit 1
fi

echo "[run] Frontend http://127.0.0.1:${VITE_PORT} (Ctrl+C detiene ambos)"
(cd "$ROOT/frontend" && npm run dev -- --host 127.0.0.1 --port "${VITE_PORT}")
