import { beforeAll, afterAll } from 'bun:test';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Task } from '../src/models/Task';

beforeAll(async () => {
  // Use test database
  process.env['MONGODB_URI'] =
    process.env['MONGODB_URI'] || 'mongodb://localhost:27017/taskmanager_test';
  await connectDatabase();
});

afterAll(async () => {
  // Clean up test database
  await Task.deleteMany({});
  await disconnectDatabase();
});
