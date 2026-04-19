const { Firestore } = require('@google-cloud/firestore');
const functions = require('@google-cloud/functions-framework');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const WEBSOCKET_GATEWAY_URL = process.env.WEBSOCKET_GATEWAY_URL || '';

const firestore = new Firestore({ projectId: PROJECT_ID });
const statsCollection = firestore.collection('movie-stats');
const processedCollection = firestore.collection('processed-messages');
const recentActivityRef = firestore.doc('recent-activity/latest');

const MAX_RECENT_ACTIVITIES = 15;

async function processEvent(messageId, data) {
  const processedDoc = await processedCollection.doc(messageId).get();
  if (processedDoc.exists) {
    console.log(JSON.stringify({ msg: 'Duplicate message skipped', messageId, movieId: data.movieId }));
    return { status: 'duplicate', viewCount: processedDoc.data().viewCount || 0 };
  }

  const statsRef = statsCollection.doc(data.movieId);
  const statsDoc = await statsRef.get();
  let newViewCount = 1;

  if (statsDoc.exists) {
    newViewCount = (statsDoc.data().viewCount || 0) + 1;
    await statsRef.update({
      viewCount: Firestore.FieldValue.increment(1),
      lastViewed: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } else {
    await statsRef.set({
      movieId: data.movieId,
      movieTitle: data.movieTitle || 'Unknown',
      viewCount: 1,
      lastViewed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  await processedCollection.doc(messageId).set({
    processedAt: new Date().toISOString(),
    movieId: data.movieId,
    viewCount: newViewCount
  });

  console.log(JSON.stringify({ msg: 'Event processed', messageId, movieId: data.movieId, viewCount: newViewCount }));
  return { status: 'processed', viewCount: newViewCount };
}

async function addRecentActivity(data, viewCount) {
  const timestamp = new Date().toISOString();
  await firestore.runTransaction(async (tx) => {
    const doc = await tx.get(recentActivityRef);
    const activities = doc.exists ? doc.data().activities || [] : [];
    activities.unshift({ movieId: data.movieId, movieTitle: data.movieTitle || 'Unknown', viewCount, timestamp });
    tx.set(recentActivityRef, { activities: activities.slice(0, MAX_RECENT_ACTIVITIES) });
  });
  console.log(JSON.stringify({ msg: 'Recent activity updated', movieId: data.movieId }));
}

async function notifyGateway(data, viewCount) {
  if (!WEBSOCKET_GATEWAY_URL) return;

  try {
    const res = await fetch(`${WEBSOCKET_GATEWAY_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movie_id: data.movieId,
        movie_title: data.movieTitle || 'Unknown',
        event: data.event || 'movie_viewed',
        timestamp: new Date().toISOString(),
        view_count: viewCount
      })
    });
    console.log(JSON.stringify({ msg: 'Gateway notified', status: res.status }));
  } catch (err) {
    console.error(JSON.stringify({ msg: 'Failed to notify gateway', error: err.message }));
  }
}

functions.cloudEvent('processMovieEvent', async (cloudEvent) => {
  const base64Data = cloudEvent.data?.message?.data;
  if (!base64Data) {
    console.error('No message data in cloud event');
    return;
  }

  const messageId = cloudEvent.data.message.messageId || cloudEvent.id;
  const data = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf8'));

  console.log(JSON.stringify({ msg: 'Received event', messageId, movieId: data.movieId }));

  const result = await processEvent(messageId, data);

  if (result.status === 'processed') {
    await Promise.all([
      addRecentActivity(data, result.viewCount),
      notifyGateway(data, result.viewCount),
    ]);
  }
});
