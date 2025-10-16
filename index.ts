import Fastify from 'fastify';
import cors from '@fastify/cors';
import { connectDatabase, disconnectDatabase } from './src/config/database';
import { taskRoutes } from './src/routes/tasks';

const { PORT = '3000', HOST = '0.0.0.0', LOG_LEVEL = 'info' } = process.env;
const port = parseInt(PORT, 10);
const host = HOST;

const fastify = Fastify({
  logger: {
    level: LOG_LEVEL,
  },
});

// Register CORS
fastify.register(cors, {
  origin: true,
});

// Register task routes
fastify.register(taskRoutes, { prefix: '/api/v1' });

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  let statusCode = (error as { statusCode?: number }).statusCode || 500;
  let message = error.message;

  if ((error as Error).name === 'CastError') {
    statusCode = 400;
    message = 'Invalid task ID format';
  } else if ((error as Error).name === 'ValidationError') {
    statusCode = 400;
  }

  fastify.log.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  reply.status(statusCode).send({
    error: error.name || 'Internal Server Error',
    message: statusCode === 500 ? 'An unexpected error occurred' : message,
  });
});

// Start server
async function start() {
  try {
    await connectDatabase();

    await fastify.listen({ port: port, host: host });

    fastify.log.info(`Server listening on http://${host}:${port}`);
    fastify.log.info(`API available at: http://${host}:${port}/api/v1/tasks`);
  } catch (err) {
    fastify.log.error(err);
    await disconnectDatabase();
    process.exit(1);
  }
}

start();
