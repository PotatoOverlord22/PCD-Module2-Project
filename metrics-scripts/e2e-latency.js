/**
 * Metric 1: End-to-end latency
 *
 * Measures the time from when a movie GET request is made on Fast Lazy Bee
 * until the corresponding movie_viewed WebSocket message arrives at the gateway.
 *
 * Usage: node e2e-latency.js
 */

import WebSocket from 'ws';
import { sleep, printStats } from './utils.js';

const GATEWAY_WS = 'wss://websocket-gateway-811910590920.us-central1.run.app';
const FAST_LAZY_BEE = 'https://fast-lazy-bee-811910590920.us-central1.run.app';
const MOVIE_ID = '573a139cf29313caabcf560f'; // "The Kiss"
const RUNS = 20;
const DELAY_BETWEEN_RUNS_MS = 2000;
const TIMEOUT_MS = 15000;

async function measureOnce() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_WS);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error('Timeout: no movie_viewed message received within 15s'));
      }
    }, TIMEOUT_MS);

    let initialStatsReceived = false;
    let tStart = 0;

    ws.on('open', () => {
      // Wait for initial_stats before starting measurement,
      // then trigger the movie access and measure time to movie_viewed.
      ws.on('message', async (data) => {
        const msg = JSON.parse(data.toString());

        if (!initialStatsReceived && msg.type === 'initial_stats') {
          initialStatsReceived = true;
          tStart = Date.now();

          // Trigger the movie access
          await fetch(`${FAST_LAZY_BEE}/api/v1/movies/${MOVIE_ID}`);

          return;
        }

        if (initialStatsReceived && msg.type === 'movie_viewed' && msg.movieId === MOVIE_ID) {
          const latency = Date.now() - tStart;
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve(latency);
          }
        }
      });
    });

    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

async function main() {
  console.log(`Running end-to-end latency test (${RUNS} runs)...\n`);
  const results = [];

  for (let i = 1; i <= RUNS; i++) {
    try {
      const latency = await measureOnce();
      results.push(latency);
      console.log(`Run ${String(i).padStart(2)}: ${latency}ms`);
    } catch (err) {
      console.log(`Run ${String(i).padStart(2)}: ERROR - ${err.message}`);
    }
    if (i < RUNS) await sleep(DELAY_BETWEEN_RUNS_MS);
  }

  printStats('End-to-End Latency Results', results, RUNS);
}

main().catch(console.error);
