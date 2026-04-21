#!/bin/bash
# Metric 4: WebSocket reconnection after gateway crash
#
# Crashes the websocket-gateway via the /crash endpoint,
# then polls the /health endpoint to measure how long Cloud Run takes to bring it back up.
# The dashboard's auto-reconnect logic (3s retry) handles the client side.
#
# Usage: ./websocket-reconnect.sh
# Note: Open the dashboard in a browser before running to observe the connection status chip.

set -euo pipefail

GATEWAY_HTTP="https://websocket-gateway-811910590920.us-central1.run.app"
RUNS=3
POLL_INTERVAL_S=1
MAX_WAIT_S=60

echo "WebSocket Gateway Reconnection Test"
echo "Gateway: $GATEWAY_HTTP"
echo "Open the dashboard in a browser to observe the disconnected/reconnected chip."
echo ""

now_ms() {
  python3 -c "import time; print(int(time.time() * 1000))"
}

wait_for_health() {
  local START
  START=$(now_ms)
  local DEADLINE=$(( $(date +%s) + MAX_WAIT_S ))

  while [ "$(date +%s)" -lt "$DEADLINE" ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_HTTP/health" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
      local NOW
      NOW=$(now_ms)
      echo $(( NOW - START ))
      return 0
    fi
    sleep "$POLL_INTERVAL_S"
  done

  echo "-1"
  return 1
}

TOTAL=0
SUCCESSES=0

for i in $(seq 1 $RUNS); do
  echo "Run $i: crashing gateway..."
  CRASH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_HTTP/crash" 2>/dev/null || echo "000")
  echo "  Crash response: HTTP $CRASH_STATUS"

  echo "  Waiting for gateway to recover..."
  RECOVERY_MS=$(wait_for_health)

  if [ "$RECOVERY_MS" = "-1" ]; then
    echo "  Timeout: gateway did not recover within ${MAX_WAIT_S}s"
  else
    echo "  Gateway recovered in ${RECOVERY_MS}ms"
    TOTAL=$(( TOTAL + RECOVERY_MS ))
    SUCCESSES=$(( SUCCESSES + 1 ))
  fi

  echo ""

  if [ "$i" -lt "$RUNS" ]; then
    echo "  Waiting 10s before next run..."
    sleep 10
  fi
done

if [ "$SUCCESSES" -gt 0 ]; then
  AVG=$(( TOTAL / SUCCESSES ))
  echo "Recovery time results:"
  echo "  Successful: $SUCCESSES / $RUNS"
  echo "  Average   : ${AVG}ms"
fi

echo "Done"
