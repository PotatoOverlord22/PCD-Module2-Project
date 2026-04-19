const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Firestore } = require('@google-cloud/firestore');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;

const firestore = new Firestore({ projectId: PROJECT_ID });
const statsCollection = firestore.collection('movie-stats');

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);

  ws.on('close', () => connectedClients.delete(ws));
  ws.on('error', () => connectedClients.delete(ws));
});

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of connectedClients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

app.post('/notify', (req, res) => {
  const { movie_id, movie_title, event, timestamp, view_count } = req.body;

  console.log(JSON.stringify({ msg: 'Received notification', movie_id, view_count }));

  broadcast({
    type: 'movie_viewed',
    movieId: movie_id,
    movieTitle: movie_title,
    event,
    timestamp,
    viewCount: view_count,
    connectedClients: connectedClients.size
  });

  res.status(200).json({ success: true });
});

app.get('/stats', async (req, res) => {
  try {
    const snapshot = await statsCollection.orderBy('viewCount', 'desc').limit(20).get();
    const stats = [];
    snapshot.forEach((doc) => stats.push({ id: doc.id, ...doc.data() }));
    res.json({ stats, count: stats.length, connectedClients: connectedClients.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/stats/:movieId', async (req, res) => {
  try {
    const doc = await statsCollection.doc(req.params.movieId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'No stats found for this movie' });
    }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'websocket-gateway', connectedClients: connectedClients.size });
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ msg: `WebSocket Gateway running on port ${PORT}` }));
});
