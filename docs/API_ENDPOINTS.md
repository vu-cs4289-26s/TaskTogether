# API Endpoints

## Authentication

```
POST /api/auth/register          - Create new user account
POST /api/auth/login             - Authenticate and get JWT token
POST /api/auth/logout            - Logout current user
POST /api/auth/refresh           - Refresh expired JWT token
```

## Households

```
GET    /api/households           - Get current user's household
POST   /api/households           - Create new household
PUT    /api/households/:id       - Update household info
GET    /api/households/:id/members         - List household members
POST   /api/households/:id/members         - Invite member to household
DELETE /api/households/:id/members/:userId - Remove member from household
```

## Tasks

```
GET    /api/tasks                - List all household tasks
POST   /api/tasks                - Create new task
PUT    /api/tasks/:id            - Update task details
DELETE /api/tasks/:id            - Delete task
POST   /api/tasks/:id/assign     - Assign task to household member
POST   /api/tasks/:id/complete   - Mark task complete (with optional photo)
GET    /api/tasks/:id/completions - Get task completion history
```

## Issues

```
GET    /api/issues               - List household issues (no-blame reports)
POST   /api/issues               - Report a new issue
PUT    /api/issues/:id           - Update issue details
DELETE /api/issues/:id           - Delete issue
PUT    /api/issues/:id/status    - Update issue status (open/in-progress/resolved)
POST   /api/issues/:id/comments  - Add resolution comment or progress update
```

## Household Rules

```
GET    /api/rules                - List household agreements and rules
POST   /api/rules                - Create new rule or agreement
PUT    /api/rules/:id            - Update rule
DELETE /api/rules/:id            - Delete rule
```

## User Profile

```
GET    /api/users/me             - Get current authenticated user profile
PUT    /api/users/me             - Update user profile (name, avatar, etc.)
PUT    /api/users/me/avatar      - Upload profile avatar image
```

---

## API Conventions

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://api.household-mgmt.com/api`

### Authentication
All endpoints except `/auth/register` and `/auth/login` require:
```
Authorization: Bearer <jwt_token>
```

### Response Format
Success response:
```json
{
  "status": "success",
  "data": {...}
}
```

Error response:
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Status Codes
- **200** - OK (successful GET, PUT)
- **201** - Created (successful POST)
- **204** - No Content (successful DELETE)
- **400** - Bad Request (invalid input)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **500** - Internal Server Error

### Pagination
List endpoints support:
```
Query: ?page=1&limit=20
Response includes:
  - total: total number of items
  - page: current page
  - limit: items per page
  - data: array of items
```

---

## Implementation Notes

- All timestamps in ISO 8601 format (UTC)
- IDs are UUIDs (cuid format)
- Images stored in AWS S3, returned as full URLs
- Multi-tenant: all requests filtered by household_id from JWT
- Soft deletes not implemented (actual deletes only)
- Recurring tasks handled by node-cron backend service
- Real-time updates via Socket.io
