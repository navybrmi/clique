#!/usr/bin/env bash
set -euo pipefail

# Usage: ./set-latency.sh <api> <delay_ms>
# Example: ./set-latency.sh tmdb 200
#          ./set-latency.sh google 300

API="${1:-}"
DELAY="${2:-}"

if [ -z "$API" ] || [ -z "$DELAY" ]; then
  echo "Usage: $0 <tmdb|google> <delay_ms>"
  echo "Example: $0 tmdb 200"
  exit 1
fi

WIREMOCK_URL="${WIREMOCK_URL:-http://localhost:8080}"

case "$API" in
  tmdb)
    URL_PATTERN="/tmdb/.*"
    ;;
  google)
    URL_PATTERN="/google/.*"
    ;;
  *)
    echo "Error: Unknown API '$API'. Use 'tmdb' or 'google'."
    exit 1
    ;;
esac

echo "Setting ${DELAY}ms latency on ${API} stubs (pattern: ${URL_PATTERN})..."

# Get all mappings matching the URL pattern
MAPPINGS=$(curl -s "${WIREMOCK_URL}/__admin/mappings" | \
  python3 -c "
import json, sys, re
data = json.load(sys.stdin)
pattern = re.compile('${URL_PATTERN}')
for m in data.get('mappings', []):
    req = m.get('request', {})
    url_path = req.get('urlPathPattern', '') or req.get('urlPattern', '') or req.get('url', '')
    if pattern.match(url_path):
        print(m['id'])
" 2>/dev/null)

if [ -z "$MAPPINGS" ]; then
  echo "No mappings found matching pattern: $URL_PATTERN"
  exit 1
fi

COUNT=0
for MAPPING_ID in $MAPPINGS; do
  # Get current mapping
  CURRENT=$(curl -s "${WIREMOCK_URL}/__admin/mappings/${MAPPING_ID}")

  # Update with fixed delay
  UPDATED=$(echo "$CURRENT" | python3 -c "
import json, sys
m = json.load(sys.stdin)
m['response']['fixedDelayMilliseconds'] = ${DELAY}
print(json.dumps(m))
")

  curl -s -X PUT "${WIREMOCK_URL}/__admin/mappings/${MAPPING_ID}" \
    -H "Content-Type: application/json" \
    -d "$UPDATED" > /dev/null

  COUNT=$((COUNT + 1))
done

echo "Updated $COUNT mapping(s) with ${DELAY}ms delay."
