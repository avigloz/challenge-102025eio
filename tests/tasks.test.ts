import { describe, test, expect, beforeEach } from 'bun:test';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { taskRoutes } from '../src/routes/tasks';
import { Task, TaskStatus } from '../src/models/Task';
import type { ITask } from '../src/models/Task';
import { User } from '../src/models/User';
import './setup';

describe('Task API', () => {
  let app: FastifyInstance;
  const testUserId = 'test-user-123';
  const otherUserId = 'other-user-456';

  beforeEach(async () => {
    // Clear database before each test
    await Task.deleteMany({});
    await User.deleteMany({});

    // Create fresh Fastify instance for each test
    app = Fastify();
    app.register(taskRoutes, { prefix: '/api/v1' });
    await app.ready();
  });

  describe('POST /api/v1/tasks', () => {
    test('should create a new task', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          title: 'Test Task',
          description: 'This is a test task',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('_id');
      expect(body.data.title).toBe('Test Task');
      expect(body.data.description).toBe('This is a test task');
      expect(body.data.status).toBe(TaskStatus.TODO);
      expect(body.data.userId).toBe(testUserId);
    });

    test('should create a task with custom status', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          title: 'In Progress Task',
          description: 'This task is already in progress',
          status: TaskStatus.IN_PROGRESS,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    test('should fail without x-user-id header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: {
          title: 'Test Task',
          description: 'This is a test task',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    test('should fail with missing title', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          description: 'This is a test task',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(['Validation Error', 'Bad Request']).toContain(body.error);
    });

    test('should fail with missing description', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          title: 'Test Task',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should fail with invalid status', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          title: 'Test Task',
          description: 'Description',
          status: 'Invalid Status',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await Task.create([
        {
          title: 'Task 1',
          description: 'Description 1',
          status: TaskStatus.TODO,
          userId: testUserId,
        },
        {
          title: 'Task 2',
          description: 'Description 2',
          status: TaskStatus.IN_PROGRESS,
          userId: testUserId,
        },
        {
          title: 'Task 3',
          description: 'Description 3',
          status: TaskStatus.DONE,
          userId: testUserId,
        },
        {
          title: 'Other User Task',
          description: 'This belongs to another user',
          status: TaskStatus.TODO,
          userId: otherUserId,
        },
      ]);
    });

    test('should get all tasks for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(3);
      expect(body.pagination).toHaveProperty('total', 3);
      expect(body.data.every((task: ITask) => task.userId === testUserId)).toBe(true);
    });

    test('should filter tasks by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks?status=In Progress',
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe(TaskStatus.IN_PROGRESS);
    });

    test('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks?page=1&limit=2',
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(2);
      expect(body.pagination.total).toBe(3);
    });

    test('should fail without x-user-id header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description',
        status: TaskStatus.TODO,
        userId: testUserId,
      });
      taskId = String(task._id);
    });

    test('should get a task by id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data._id).toBe(taskId);
      expect(body.data.title).toBe('Test Task');
    });

    test('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${fakeId}`,
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    test('should return 404 for task belonging to another user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': otherUserId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    test('should return 400 for invalid task id format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/invalid-id',
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Original Title',
        description: 'Original Description',
        status: TaskStatus.TODO,
        userId: testUserId,
      });
      taskId = String(task._id);
    });

    test('should update task title', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          title: 'Updated Title',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('Updated Title');
      expect(body.data.description).toBe('Original Description');
    });

    test('should update task status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          status: TaskStatus.IN_PROGRESS,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    test('should update multiple fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          title: 'New Title',
          description: 'New Description',
          status: TaskStatus.DONE,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('New Title');
      expect(body.data.description).toBe('New Description');
      expect(body.data.status).toBe(TaskStatus.DONE);
    });

    test('should fail with invalid status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          status: 'Invalid Status',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${fakeId}`,
        headers: {
          'x-user-id': testUserId,
        },
        payload: {
          title: 'Updated Title',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    test('should not update task belonging to another user', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': otherUserId,
        },
        payload: {
          title: 'Hacked Title',
        },
      });

      expect(response.statusCode).toBe(404);

      // Verify task was not modified
      const task = await Task.findById(taskId);
      expect(task?.title).toBe('Original Title');
    });

    test('should fail with empty update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': testUserId,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Task to Delete',
        description: 'This task will be deleted',
        status: TaskStatus.TODO,
        userId: testUserId,
      });
      taskId = String(task._id);
    });

    test('should delete a task', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify task was deleted
      const task = await Task.findById(taskId);
      expect(task).toBeNull();
    });

    test('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tasks/${fakeId}`,
        headers: {
          'x-user-id': testUserId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    test('should not delete task belonging to another user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tasks/${taskId}`,
        headers: {
          'x-user-id': otherUserId,
        },
      });

      expect(response.statusCode).toBe(404);

      // Verify task still exists
      const task = await Task.findById(taskId);
      expect(task).not.toBeNull();
    });
  });

  describe('User Isolation', () => {
    test('users should only see their own tasks', async () => {
      // Create tasks for multiple users
      await Task.create([
        {
          title: 'User 1 Task 1',
          description: 'Description',
          userId: testUserId,
        },
        {
          title: 'User 1 Task 2',
          description: 'Description',
          userId: testUserId,
        },
        {
          title: 'User 2 Task 1',
          description: 'Description',
          userId: otherUserId,
        },
      ]);

      // Get tasks for user 1
      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': testUserId,
        },
      });

      const body1 = JSON.parse(response1.body);
      expect(body1.data).toHaveLength(2);
      expect(body1.data.every((task: ITask) => task.userId === testUserId)).toBe(true);

      // Get tasks for user 2
      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: {
          'x-user-id': otherUserId,
        },
      });

      const body2 = JSON.parse(response2.body);
      expect(body2.data).toHaveLength(1);
      expect(body2.data[0].userId).toBe(otherUserId);
    });
  });
});
