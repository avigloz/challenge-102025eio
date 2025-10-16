import { type FastifyRequest, type FastifyReply } from 'fastify';
import { User } from '../models/User';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = request.headers['x-user-id'] as string;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'x-user-id header is required',
    });
  }

  // Ensure user exists in database (or create if doesn't exist for simplicity)
  try {
    let user = await User.findOne({ userId });

    if (!user) {
      user = await User.create({ userId });
    }

    request.userId = userId;
  } catch (error) {
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to authenticate user',
    });
  }
}
