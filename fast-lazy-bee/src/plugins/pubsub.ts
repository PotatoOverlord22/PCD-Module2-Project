import { PubSub } from '@google-cloud/pubsub';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

const pubsubPlugin = fp(
  async (fastify: FastifyInstance) => {
    const projectId = fastify.config.GOOGLE_CLOUD_PROJECT;
    const topicName = fastify.config.PUBSUB_TOPIC;

    if (!projectId) {
      fastify.log.error('GOOGLE_CLOUD_PROJECT not set — Pub/Sub publishing disabled');
      fastify.decorate('publishMovieEvent', async () => {});
      return;
    }

    const pubsub = new PubSub({ projectId });
    const topic = pubsub.topic(topicName);

    fastify.decorate(
      'publishMovieEvent',
      async (movieId: string, movieTitle: string): Promise<void> => {
        try {
          const message = {
            event: 'movie_viewed',
            movieId,
            movieTitle,
            timestamp: new Date().toISOString()
          };
          await topic.publishMessage({ json: message });
          fastify.log.info({ movieId, topic: topicName }, 'Published movie_viewed event');
        } catch (err) {
          // Fire-and-forget: log but don't fail the request
          fastify.log.error({ err, movieId }, 'Failed to publish movie_viewed event');
        }
      }
    );
  },
  { name: 'pubsub', dependencies: ['server-config'] }
);

export default pubsubPlugin;
