#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERF_DIR="$(dirname "$SCRIPT_DIR")"

# Which k6 script to run (default: mixed-workload)
K6_SCRIPT="${K6_SCRIPT:-mixed-workload.js}"
TMDB_LATENCY="${TMDB_LATENCY:-0}"
GOOGLE_LATENCY="${GOOGLE_LATENCY:-0}"

echo "==> Starting perf stack in REPLAY mode..."
echo "    WireMock will serve stubs from mappings/ (no real API calls)."
echo ""

# Start db + wiremock + app
docker compose -f "$PERF_DIR/docker-compose.perf.yml" up -d db wiremock app

echo "==> Waiting for WireMock..."
until curl -sf http://localhost:8080/__admin/health > /dev/null 2>&1; do
  sleep 1
done

echo "==> Waiting for app..."
until curl -sf http://localhost:3000 > /dev/null 2>&1; do
  sleep 2
done

# Apply latency if requested
if [ "$TMDB_LATENCY" -gt 0 ]; then
  echo "==> Setting TMDB latency to ${TMDB_LATENCY}ms..."
  "$SCRIPT_DIR/set-latency.sh" tmdb "$TMDB_LATENCY"
fi

if [ "$GOOGLE_LATENCY" -gt 0 ]; then
  echo "==> Setting Google Places latency to ${GOOGLE_LATENCY}ms..."
  "$SCRIPT_DIR/set-latency.sh" google "$GOOGLE_LATENCY"
fi

echo "==> Running k6 load test: $K6_SCRIPT"
echo ""

# Run k6 via docker compose with the test profile
docker compose -f "$PERF_DIR/docker-compose.perf.yml" --profile test run --rm \
  k6 run "/scripts/$K6_SCRIPT" \
  --out json=/results/result-$(date +%Y%m%d-%H%M%S).json

echo ""
echo "==> Load test complete. Results saved to $PERF_DIR/k6/results/"
echo "==> Run 'npm run perf:stop' to tear down the stack."
