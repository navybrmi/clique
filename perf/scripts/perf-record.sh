#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERF_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Starting perf stack in RECORDING mode..."
echo "    WireMock will proxy to real APIs and record responses."
echo ""

# Start db + wiremock in recording proxy mode + app
docker compose -f "$PERF_DIR/docker-compose.perf.yml" up -d db wiremock

echo "==> Waiting for WireMock to be ready..."
until curl -sf http://localhost:8080/__admin/health > /dev/null 2>&1; do
  sleep 1
done

# Enable recording: proxy TMDB requests
echo "==> Configuring WireMock recording for TMDB..."
curl -s -X POST http://localhost:8080/__admin/recordings/start \
  -H "Content-Type: application/json" \
  -d '{
    "targetBaseUrl": "https://api.themoviedb.org",
    "filters": {
      "urlPathPattern": "/tmdb/.*"
    },
    "captureHeaders": {
      "Content-Type": {}
    },
    "requestBodyPattern": {
      "matcher": "equalTo",
      "ignoreArrayOrder": false,
      "ignoreExtraElements": true
    },
    "persist": true,
    "repeatsAsScenarios": false
  }' > /dev/null

echo "==> Starting app..."
docker compose -f "$PERF_DIR/docker-compose.perf.yml" up -d app

echo ""
echo "============================================"
echo "  Recording mode is ACTIVE"
echo ""
echo "  App:      http://localhost:3000"
echo "  WireMock: http://localhost:8080"
echo ""
echo "  Perform your UI actions now."
echo "  Press Enter when done to stop recording."
echo "============================================"
echo ""

read -r -p "Press Enter to stop recording... "

echo ""
echo "==> Stopping recording..."
curl -s -X POST http://localhost:8080/__admin/recordings/stop > /dev/null

echo "==> Recordings saved to $PERF_DIR/wiremock/recordings/"
echo "    Review and copy desired stubs to $PERF_DIR/wiremock/mappings/"
echo ""
echo "==> Stopping stack..."
docker compose -f "$PERF_DIR/docker-compose.perf.yml" down

echo "==> Done."
