/**
 * Metric 2: Eventual consistency window
 *
 * Measures the time from when a movie GET request is made on Fast Lazy Bee
 * until the viewCount for that movie is updated in Firestore (visible via gateway /stats/:movieId).
 *
 * Usage: node consistency-window.js
 */

import { sleep, printStats } from './utils.js';

const FAST_LAZY_BEE = 'https://fast-lazy-bee-811910590920.us-central1.run.app';
const GATEWAY_HTTP = 'https://websocket-gateway-811910590920.us-central1.run.app';
const MOVIE_ID = '573a139cf29313caabcf560f'; // "The Kiss"
const RUNS = 10;
const POLL_INTERVAL_MS = 500;
const MAX_WAIT_MS = 90000;

async function getViewCount() {
  const res = await fetch(`${GATEWAY_HTTP}/stats/${MOVIE_ID}`);
  if (res.status === 404) return null;
  const data = await res.json();
  return data.viewCount ?? null;
}

async function measureOnce(run) {
  const viewCountBefore = await getViewCount();
  console.log(`  Run ${run}: viewCount before = ${viewCountBefore}`);

  const tStart = Date.now();

  // Trigger the event
  await fetch(`${FAST_LAZY_BEE}/api/v1/movies/${MOVIE_ID}`);

  // Poll until viewCount increases
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const viewCountNow = await getViewCount();
    if (viewCountNow !== null && viewCountNow !== viewCountBefore) {
      return Date.now() - tStart;
    }
  }

  throw new Error(`Timeout: viewCount did not change within ${MAX_WAIT_MS}ms`);
}

async function main() {
  console.log(`Running eventual consistency window test (${RUNS} runs)...\n`);
  const results = [];

  for (let i = 1; i <= RUNS; i++) {
    try {
      const latency = await measureOnce(i);
      results.push(latency);
      console.log(`consistent after ${latency}ms\n`);
    } catch (err) {
      console.log(`ERROR: ${err.message}\n`);
    }
    // Wait between runs so each is independent
    await sleep(3000);
  }

  printStats('Eventual Consistency Window Results', results, RUNS);
}

main().catch(console.error);
