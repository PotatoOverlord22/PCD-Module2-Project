#!/bin/bash
# Metric 3: Cloud Function throughput under variable load
#
# Uses `hey` to send increasing load to Fast Lazy Bee's movie endpoint,
# which triggers Pub/Sub events processed by the event-processor Cloud Function.
# After each run, waits 30s then checks how many events were processed via gateway /stats.
#
# Prerequisites: hey installed (brew install hey)
# Usage: ./throughput-test.sh

set -euo pipefail

FAST_LAZY_BEE="https://fast-lazy-bee-811910590920.us-central1.run.app"
GATEWAY_HTTP="https://websocket-gateway-811910590920.us-central1.run.app"
MOVIE_ID="573a139cf29313caabcf560f"
MOVIE_ENDPOINT="$FAST_LAZY_BEE/api/v1/movies/$MOVIE_ID"
WAIT_AFTER_LOAD_S=30

echo "Cloud Function Throughput Test"
echo "Movie endpoint: $MOVIE_ENDPOINT"
echo ""

get_view_count() {
  curl -s "$GATEWAY_HTTP/stats/$MOVIE_ID" | jq -r '.viewCount // 0'
}

run_test() {
  local CONCURRENCY=$1
  local REQUESTS=$2

  echo "Concurrency: $CONCURRENCY | Total requests: $REQUESTS"

  local COUNT_BEFORE
  COUNT_BEFORE=$(get_view_count)
  echo "viewCount before: $COUNT_BEFORE"

  echo "Running hey..."
  hey -n "$REQUESTS" -c "$CONCURRENCY" "$MOVIE_ENDPOINT"

  echo ""
  echo "Waiting ${WAIT_AFTER_LOAD_S}s for event-processor to flush..."
  sleep "$WAIT_AFTER_LOAD_S"

  local COUNT_AFTER
  COUNT_AFTER=$(get_view_count)
  local PROCESSED=$(( COUNT_AFTER - COUNT_BEFORE ))
  echo "viewCount after : $COUNT_AFTER"
  echo "Events processed: $PROCESSED / $REQUESTS"
  echo ""
}

run_test 10 100
run_test 50 500
run_test 100 1000

echo "Done"
