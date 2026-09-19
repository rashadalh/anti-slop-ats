#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export WEB_PORT="${WEB_PORT:-5173}"
npm install
npm run dev -w @anti-slop/web -- --host 127.0.0.1 --port "$WEB_PORT"
