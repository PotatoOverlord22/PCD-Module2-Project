# PCD Module 2 – Distributed Analytics Dashboard

Real-time analytics dashboard built on Google Cloud Platform. When a movie is accessed via the Fast Lazy Bee API, an event flows through Pub/Sub to a Cloud Function that persists stats and recent activity to Firestore, then notifies a WebSocket Gateway which pushes live updates to the dashboard.

## Services

| Service           | Type             | URL                                                                                           |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| Fast Lazy Bee     | Cloud Run        | https://fast-lazy-bee-811910590920.us-central1.run.app                                        |
| websocket-gateway | Cloud Run        | https://websocket-gateway-811910590920.us-central1.run.app                                    |
| event-processor   | Cloud Function   | triggered by `movie-events` Pub/Sub topic                                                     |
| dashboard-website | Firebase Hosting | https://project-b35d6504-badb-413a-b0f.web.app _(currently disabled — run locally if needed)_ |

## Prerequisites

### Tools

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [Node.js](https://nodejs.org)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

### Authentication

**One-time:**

```bash
gcloud auth login
gcloud config set project project-b35d6504-badb-413a-b0f
firebase login
```

### GCP APIs

**One-time:**

```bash
gcloud services enable run.googleapis.com cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com pubsub.googleapis.com firestore.googleapis.com \
  artifactregistry.googleapis.com eventarc.googleapis.com
```

### External services

- **MongoDB Atlas** – cluster `pcd-module2-project`, database `sample_mflix`. Network Access must allow `0.0.0.0/0`.
- **Firestore** – Native mode, region `us-central1` (already created).
- **Pub/Sub topic** – `movie-events` (already created).

---

## Deploying Fast Lazy Bee

```bash
cd fast-lazy-bee
npm install
gcloud builds submit --tag us-central1-docker.pkg.dev/$(gcloud config get-value project)/myrepo/fast-lazy-bee:v1
gcloud run deploy fast-lazy-bee \
  --image us-central1-docker.pkg.dev/$(gcloud config get-value project)/myrepo/fast-lazy-bee:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "MONGO_URL=<mongo-connection-string>,NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project),PUBSUB_TOPIC=movie-events" \
  --min-instances 1
```

Replace `<mongo-connection-string>` with the full MongoDB Atlas URI including database name (`/sample_mflix` in our case).

---

## Deploying websocket-gateway

```bash
cd websocket-gateway
gcloud builds submit --tag us-central1-docker.pkg.dev/$(gcloud config get-value project)/myrepo/websocket-gateway:v1
gcloud run deploy websocket-gateway \
  --image us-central1-docker.pkg.dev/$(gcloud config get-value project)/myrepo/websocket-gateway:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)" \
  --min-instances 1
```

---

## Deploying event-processor (Cloud Function)

```bash
cd analytics-event-processor
gcloud functions deploy event-processor \
  --gen2 \
  --runtime=nodejs22 \
  --region=us-central1 \
  --source=. \
  --entry-point=processMovieEvent \
  --trigger-topic=movie-events \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project),WEBSOCKET_GATEWAY_URL=https://websocket-gateway-811910590920.us-central1.run.app" \
  --min-instances=0 \
  --max-instances=5
```

**One-time — grant the Pub/Sub trigger permission to invoke it:**

```bash
gcloud run services add-iam-policy-binding event-processor \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

---

## Deploying dashboard-website

**One-time Firebase init:**

```bash
cd dashboard-website
npm install
firebase init hosting
# public dir: dist
# single-page app: y
# GitHub deploys: n
```

### Deploy

```bash
cd dashboard-website
npm run deploy
```

### Take down (disable public access)

```bash
firebase hosting:disable
```

---

## Environment Variables Reference

### Fast Lazy Bee

| Variable               | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `MONGO_URL`            | MongoDB Atlas connection string (with database name) |
| `NODE_ENV`             | `production`                                         |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID                                       |
| `PUBSUB_TOPIC`         | Pub/Sub topic name (default: `movie-events`)         |

### websocket-gateway

| Variable               | Description    |
| ---------------------- | -------------- |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |

### event-processor

| Variable                | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `GOOGLE_CLOUD_PROJECT`  | GCP project ID                                  |
| `WEBSOCKET_GATEWAY_URL` | Full HTTPS URL of the websocket-gateway service |

---

## Local Development

### dashboard-website

```bash
cd dashboard-website
npm run dev
# Connects to deployed websocket-gateway by default
# Override with VITE_GATEWAY_WS and VITE_GATEWAY_HTTP env vars
```

---

## Metrics Collection

Performance and reliability tests are located in `metrics-scripts/`. Prerequisites: Node.js v20+, `python3`, `hey` (`brew install hey`), `jq`.

```bash
cd metrics-scripts
npm install
```

### Warm vs Cold setup

Before running tests, configure all services to the desired state:

```bash
# Cold — all services scale to 0 (wait 10-15 min after running)
./set-cold.sh

# Warm — all services keep at least 1 instance alive (wait ~30s after running)
./set-warm.sh
```

### End-to-End Latency

Measures the time from `GET /movies/:id` on Fast Lazy Bee until the `movie_viewed` WebSocket message arrives at the client. Runs 20 times and reports p50, p95, p99.

```bash
node e2e-latency.js
```

### Eventual Consistency Window

Measures the time from `GET /movies/:id` until the view count is updated in Firestore, polled via the gateway `/stats/:movieId` endpoint every 500ms. Runs 10 times and reports p50, p95, p99.

```bash
node consistency-window.js
```

### Cloud Function Throughput

Uses `hey` to send load at concurrency 10, 50, and 100 against the Fast Lazy Bee movie endpoint. After each run, waits 30s then checks how many Pub/Sub events were processed by the Cloud Function.

```bash
./throughput-test.sh
```

### WebSocket Reconnection

Crashes the gateway via the `/crash` endpoint and measures how long Cloud Run takes to bring a new instance up, polling `/health` every second. Runs 3 times and reports average recovery time. You can also observe the webscoket clients being disconnected by opening up the dashboard website and looking at the top right "Online/offline" status while running this test.

```bash
./websocket-reconnect.sh
```

---

## Cleanup / Teardown

Delete all cloud resources to avoid ongoing charges:

```bash
# Delete Cloud Run services
gcloud run services delete fast-lazy-bee --region us-central1 --quiet
gcloud run services delete websocket-gateway --region us-central1 --quiet

# Delete Cloud Function
gcloud functions delete event-processor --region us-central1 --gen2 --quiet

# Delete Pub/Sub topic
gcloud pubsub topics delete movie-events --quiet

# Delete container images from Artifact Registry
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/$(gcloud config get-value project)/myrepo/fast-lazy-bee --quiet
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/$(gcloud config get-value project)/myrepo/websocket-gateway --quiet

# Disable Firebase Hosting
firebase hosting:disable

# Delete Firestore collections (via Google Cloud Console)
# Console → Firestore → select collections (movie-stats, processed-messages, recent-activity) → Delete
```
