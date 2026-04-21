#!/bin/bash
# Sets all services to min-instances=1 for warm (steady-state) testing.
# Wait ~30 seconds after running for instances to spin up.
# Usage: ./set-warm.sh

set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
GATEWAY_URL="https://websocket-gateway-811910590920.us-central1.run.app"

echo "Setting all services to min-instances=1..."

gcloud run services update fast-lazy-bee --region "$REGION" --min-instances 1
echo "fast-lazy-bee: min-instances=1"

gcloud run services update websocket-gateway --region "$REGION" --min-instances 1
echo "websocket-gateway: min-instances=1"

cd "$(dirname "$0")/../analytics-event-processor"
gcloud functions deploy event-processor \
  --gen2 --runtime=nodejs22 --region="$REGION" --source=. \
  --entry-point=processMovieEvent --trigger-topic=movie-events \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,WEBSOCKET_GATEWAY_URL=$GATEWAY_URL" \
  --min-instances=1 --max-instances=5
echo "event-processor: min-instances=1"

echo ""
echo "Done. Wait ~30 seconds for instances to start before running tests."
