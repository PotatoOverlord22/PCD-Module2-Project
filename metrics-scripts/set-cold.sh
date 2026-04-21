#!/bin/bash
# Sets all services to min-instances=0 for cold start testing.
# Wait 10-15 minutes after running before executing tests.
# Usage: ./set-cold.sh

set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
GATEWAY_URL="https://websocket-gateway-811910590920.us-central1.run.app"

echo "Setting all services to min-instances=0..."

gcloud run services update fast-lazy-bee --region "$REGION" --min-instances 0
echo "fast-lazy-bee: min-instances=0"

gcloud run services update websocket-gateway --region "$REGION" --min-instances 0
echo "websocket-gateway: min-instances=0"

cd "$(dirname "$0")/../analytics-event-processor"
gcloud functions deploy event-processor \
  --gen2 --runtime=nodejs22 --region="$REGION" --source=. \
  --entry-point=processMovieEvent --trigger-topic=movie-events \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,WEBSOCKET_GATEWAY_URL=$GATEWAY_URL" \
  --min-instances=0 --max-instances=5
echo "event-processor: min-instances=0"

echo ""
echo "Done. Wait 10-15 minutes for all instances to drain before running tests."
