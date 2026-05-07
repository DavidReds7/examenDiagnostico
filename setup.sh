#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Se requiere python3 en el PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Se requiere npm en el PATH." >&2
  exit 1
fi

echo "[setup] Entorno virtual en .venv"
if [ ! -d "$ROOT/.venv" ]; then
  python3 -m venv "$ROOT/.venv"
fi

# shellcheck source=/dev/null
source "$ROOT/.venv/bin/activate"

echo "[setup] Dependencias Python (backend)"
pip install --upgrade pip >/dev/null
pip install -r "$ROOT/backend/requirements.txt"

echo "[setup] Dependencias Node (frontend)"
(cd "$ROOT/frontend" && npm install)

if [ ! -f "$ROOT/backend/.env" ]; then
  if [ -f "$ROOT/backend/.env.example" ]; then
    cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
    echo "[setup] Creado backend/.env desde .env.example (revise credenciales MySQL)."
  else
    echo "[setup] Aviso: no existe backend/.env; copie backend/.env.example manualmente." >&2
  fi
fi

if [ ! -f "$ROOT/frontend/.env" ] && [ -f "$ROOT/frontend/.env.example" ]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
  echo "[setup] Creado frontend/.env desde .env.example (opcional para VITE_API_URL)."
fi

echo "[setup] Listo. Ejecute ./run.sh para levantar backend y frontend."
