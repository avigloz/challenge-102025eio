# Task Management API

RESTful API for task management with user authorization. Built with TypeScript, Bun, Fastify, and MongoDB.

## Features

- Full CRUD operations for tasks
- Four task states: "To do", "In Progress", "Done", "Archived"
- User isolation/authorization via simple header-based authentication
- Input validation and error handling
- Pagination and filtering

## Quick Start

### Using Docker (Recommended)

```bash
docker-compose up -d
```

The API will be available at `http://localhost:3000`

### Local Development

Requires MongoDB running locally or via Docker:

```bash
# Install dependencies
bun install

# Create .env file
cp .env.example .env

# Start server
bun run dev
```

### Run Tests

```bash
bun test
```

## API Endpoints

All endpoints require the `x-user-id` header for authentication.

Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List all tasks (supports `?status=`, `?page=`, `?limit=`) |
| GET | `/tasks/:id` | Get task by ID |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |

## Usage Examples

### Create a task

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Task", "description": "Task details"}'
```

### Get all tasks

```bash
curl http://localhost:3000/api/v1/tasks -H "x-user-id: user123"
```

### Update task status

```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/{id} \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json" \
  -d '{"status": "Done"}'
```

### Delete a task

```bash
curl -X DELETE http://localhost:3000/api/v1/tasks/{id} \
  -H "x-user-id: user123"
```

## Request/Response Format

### Create/Update Task

```json
{
  "title": "Task title",
  "description": "Task description",
  "status": "To do"
}
```

Valid status values: `"To do"`, `"In Progress"`, `"Done"`, `"Archived"`

### Single task response

```json
{
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Task title",
    "description": "Task description",
    "status": "To do",
    "userId": "user123",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### All tasks response

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Errors

```json
{
  "error": "Error Type",
  "message": "Error description"
}
```

## Project Structure

```
src/
├── config/database.ts       # MongoDB connection
├── middleware/auth.ts       # User authentication
├── models/
│   ├── Task.ts              # Task schema
│   └── User.ts              # User schema
├── routes/tasks.ts          # API routes
└── utils/errors.ts          # Custom error classes
tests/
├── setup.ts                 # Test setup
└── tasks.test.ts            # API tests (25 tests)
index.ts                     # Application entry point
```

## Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/taskmanager
NODE_ENV=development
LOG_LEVEL=info
```

## Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```
