import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { Task, TaskStatus } from '../models/Task';
import { authMiddleware } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../utils/errors';

interface CreateTaskBody {
  title: string;
  description: string;
  status?: TaskStatus;
}

interface UpdateTaskBody {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

interface TaskParams {
  id: string;
}

interface RawQueryParams {
  status?: TaskStatus;
  page?: string;
  limit?: string;
}

export async function taskRoutes(fastify: FastifyInstance) {
  // Apply auth middleware to all routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /tasks - Get all tasks for the authenticated user
  fastify.get<{ Querystring: RawQueryParams }>(
    '/tasks',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: Object.values(TaskStatus) },
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: RawQueryParams }>, reply: FastifyReply) => {
      const { status, page: pageParam = '1', limit: limitParam = '50' } = request.query;
      const userId = request.userId;

      const page = parseInt(pageParam, 10);
      const limit = parseInt(limitParam, 10);

      const query: { userId: string; status?: TaskStatus } = { userId };

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        Task.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Task.countDocuments(query),
      ]);

      return reply.send({
        data: tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    },
  );

  // GET /tasks/:id - Get a single task by ID
  fastify.get<{ Params: TaskParams }>(
    '/tasks/:id',
    async (request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = request.userId;

      try {
        const task = await Task.findOne({ _id: id, userId }).lean();

        if (!task) {
          throw new NotFoundError('Task not found');
        }

        return reply.send({ data: task });
      } catch (error) {
        if ((error as Error).name === 'CastError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: 'Invalid task ID format',
          });
        }
        throw error;
      }
    },
  );

  // POST /tasks - Create a new task
  fastify.post<{ Body: CreateTaskBody }>(
    '/tasks',
    async (request: FastifyRequest<{ Body: CreateTaskBody }>, reply: FastifyReply) => {
      const { title, description, status = TaskStatus.TODO } = request.body;
      const userId = request.userId;

      if (!title || !description) {
        throw new ValidationError('Title and description are required');
      }

      if (status && !Object.values(TaskStatus).includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }

      const task = await Task.create({
        title,
        description,
        status,
        userId,
      });

      return reply.status(201).send({ data: task });
    },
  );

  // PATCH /tasks/:id - Update a task
  fastify.patch<{ Params: TaskParams; Body: UpdateTaskBody }>(
    '/tasks/:id',
    async (
      request: FastifyRequest<{ Params: TaskParams; Body: UpdateTaskBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const { title, description, status } = request.body;
      const userId = request.userId;

      if (status && !Object.values(TaskStatus).includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }

      const updateData: Partial<UpdateTaskBody> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;

      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('No valid fields provided for update');
      }

      const task = await Task.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      return reply.send({ data: task });
    },
  );

  // DELETE /tasks/:id - Delete a task
  fastify.delete<{ Params: TaskParams }>(
    '/tasks/:id',
    async (request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = request.userId;

      const task = await Task.findOneAndDelete({ _id: id, userId });

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      return reply.status(204).send();
    },
  );
}
