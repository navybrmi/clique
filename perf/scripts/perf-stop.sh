#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERF_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Tearing down perf stack..."
docker compose -f "$PERF_DIR/docker-compose.perf.yml" --profile test down -v

echo "==> Done."
