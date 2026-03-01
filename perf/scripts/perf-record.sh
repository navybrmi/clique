#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERF_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$PERF_DIR")"

# Recording mode needs real API keys to proxy to actual APIs
if [ -z "${TMDB_API_KEY:-}" ] || [ -z "${GOOGLE_PLACES_API_KEY:-}" ]; then
  # Try loading from project .env file
  if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "==> Loading API keys from .env file..."
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
    set +a
  fi
fi

if [ -z "${TMDB_API_KEY:-}" ]; then
  echo "Error: TMDB_API_KEY is required for recording mode."
  echo "Set it via environment variable or in the project .env file."
  exit 1
fi

if [ -z "${GOOGLE_PLACES_API_KEY:-}" ]; then
  echo "Error: GOOGLE_PLACES_API_KEY is required for recording mode."
  echo "Set it via environment variable or in the project .env file."
  exit 1
fi

echo "==> Starting perf stack in RECORDING mode..."
echo "    WireMock will proxy to real APIs and record responses."
echo ""

# Start db + wiremock
docker compose -f "$PERF_DIR/docker-compose.perf.yml" up -d db wiremock

echo "==> Waiting for WireMock to be ready..."
until curl -sf http://localhost:8080/__admin/health > /dev/null 2>&1; do
  sleep 1
done

# Create proxy mappings that rewrite paths and forward to real APIs
echo "==> Configuring proxy stubs for TMDB..."
curl -s -X POST http://localhost:8080/__admin/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 1,
    "request": {
      "urlPathPattern": "/tmdb/(.*)"
    },
    "response": {
      "proxyBaseUrl": "https://api.themoviedb.org/3",
      "proxyUrlPrefixToRemove": "/tmdb"
    }
  }' > /dev/null

echo "==> Configuring proxy stubs for Google Places..."
curl -s -X POST http://localhost:8080/__admin/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 1,
    "request": {
      "urlPathPattern": "/google/(.*)"
    },
    "response": {
      "proxyBaseUrl": "https://maps.googleapis.com",
      "proxyUrlPrefixToRemove": "/google"
    }
  }' > /dev/null

# Start recording so proxied responses get captured
echo "==> Starting WireMock recording..."
curl -s -X POST http://localhost:8080/__admin/recordings/start \
  -H "Content-Type: application/json" \
  -d '{
    "captureHeaders": {
      "Content-Type": {}
    },
    "persist": true,
    "repeatsAsScenarios": false
  }' > /dev/null

# Start app with real API keys (so proxied requests authenticate properly)
echo "==> Starting app with real API keys..."
TMDB_API_KEY="$TMDB_API_KEY" GOOGLE_PLACES_API_KEY="$GOOGLE_PLACES_API_KEY" \
  docker compose -f "$PERF_DIR/docker-compose.perf.yml" up -d app

echo ""
echo "============================================"
echo "  Recording mode is ACTIVE"
echo ""
echo "  App:      http://localhost:3000"
echo "  WireMock: http://localhost:8080/__admin"
echo ""
echo "  Perform your UI actions now."
echo "  Press Enter when done to stop recording."
echo "============================================"
echo ""

read -r -p "Press Enter to stop recording... "

echo ""
echo "==> Stopping recording..."
SNAPSHOT=$(curl -s -X POST http://localhost:8080/__admin/recordings/stop)
echo "    Recorded mappings:"
echo "$SNAPSHOT" | python3 -m json.tool 2>/dev/null || echo "$SNAPSHOT"

echo ""
echo "==> Recordings saved. Check WireMock mappings at:"
echo "    http://localhost:8080/__admin/mappings"
echo ""
echo "    To save recordings to files, run:"
echo "    curl -s http://localhost:8080/__admin/mappings | python3 -m json.tool > recorded-mappings.json"
echo ""
echo "    Copy desired stubs to: $PERF_DIR/wiremock/mappings/"
echo ""
echo "==> Stopping stack..."
docker compose -f "$PERF_DIR/docker-compose.perf.yml" down

echo "==> Done."
