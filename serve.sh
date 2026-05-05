#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

python3 server.py &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 0.3

if command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:5173"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://127.0.0.1:5173" >/dev/null 2>&1 || true
fi

wait "$SERVER_PID"

