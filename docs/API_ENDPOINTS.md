# API Endpoints

## Authentication

All endpoints except `/auth/register` and `/auth/login` require

```
Authorization: Bearer <jwt_token>
```

```
POST /api/auth/register          - Create new user account
POST /api/auth/login             - Authenticate and get JWT token
POST /api/auth/logout            - Logout current user
POST /api/auth/refresh           - Refresh expired JWT token
```

## Households

```
GET    /api/households                          # Get current user's household
POST   /api/households                          # Create new household
PUT    /api/households/:id                      # Update household info
GET    /api/households/:id/members              # List household members
POST   /api/households/:id/members              # Invite member to household
DELETE /api/households/:id/members/:userId      # Remove member from household
POST   /api/households/:id/invites              # Generate invite link/code
POST   /api/households/join/:code               # Join household via invite
```

## Tasks

```
GET    /api/tasks                               # List all household tasks (with filters)
POST   /api/tasks                               # Create new task
GET    /api/tasks/:id                           # Get single task with details
PUT    /api/tasks/:id                           # Update task details
DELETE /api/tasks/:id                           # Delete task
POST   /api/tasks/:id/assign                    # Assign task to member
POST   /api/tasks/:id/complete                  # Mark task complete (with optional photo)
GET    /api/tasks/:id/completions               # Get task completion history
```

### Query Parameters for GET /api/tasks
```
?status=PENDING              # Filter by status (PENDING|IN_PROGRESS|COMPLETED|SKIPPED)
?assignedTo=userId           # Filter by assigned user
?dueDate=2026-02-03          # Filter by due date
?isRecurring=true            # Filter recurring tasks
?page=1                      # Pagination
?limit=20                    # Results per page
```

## Issues

```
GET    /api/issues                              # List household issues (with filters)
POST   /api/issues                              # Report a new issue
GET    /api/issues/:id                          # Get single issue with comments
PUT    /api/issues/:id                          # Update issue details
DELETE /api/issues/:id                          # Delete issue
PUT    /api/issues/:id/status                   # Update issue status
POST   /api/issues/:id/comments                 # Add resolution comment or update
```

### Query Parameters for GET /api/issues

```
?status=OPEN                 # Filter by status (OPEN|IN_PROGRESS|RESOLVED|ARCHIVED)
?page=1                      # Pagination
?limit=20                    # Results per page
```

## Quality Time Activites

```
GET    /api/activities                          # List scheduled activities
POST   /api/activities                          # Create new activity
GET    /api/activities/:id                      # Get single activity
PUT    /api/activities/:id                      # Update activity
DELETE /api/activities/:id                      # Delete activity
POST   /api/activities/:id/checkin              # Check in to activity (with photo)
GET    /api/activities/:id/participants         # Get activity participants
POST   /api/activities/:id/participants         # Add participant
DELETE /api/activities/:id/participants/:userId # Remove participant
```

### Query Parameters for GET /api/activities

```
?type=HOMEWORK               # Filter by type (HOMEWORK|BONDING|CHORE|OTHER)
?status=SCHEDULED            # Filter by status (SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED)
?date=2026-02-03             # Filter by scheduled date
```


## Household Rules

```
GET    /api/rules                               # List household agreements and rules
POST   /api/rules                               # Create new rule or agreement
PUT    /api/rules/:id                           # Update rule
DELETE /api/rules/:id                           # Delete rule
```

## User Profile

```
GET    /api/users/me                            # Get current authenticated user profile
PUT    /api/users/me                            # Update user profile
POST   /api/users/me/avatar                     # Upload profile avatar image
```


## Dashboard
```
GET    /api/dashboard                           # Get household overview
```
---

## API Conventions

### Base URL
- Development: `http://localhost:3001/api`
- Production: TBD

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

## Error Codes

See `types/shared.ts` for complete list of error codes. Common ones:

- `AUTH_INVALID_CREDENTIALS` - Invalid email/password
- `AUTH_TOKEN_EXPIRED` - JWT token expired
- `HOUSEHOLD_NOT_FOUND` - Household doesn't exist
- `TASK_UNAUTHORIZED` - No permission for this task
- `VALIDATION_ERROR` - Request validation failed

---

## Notes

- All timestamps in ISO 8601 format (UTC)
- IDs are UUIDs (cuid format)
- Images stored in AWS S3, returned as full URLs
- Multi-tenant: all requests filtered by `householdId` from JWT
- Soft deletes not implemented (actual deletes only)
- Recurring tasks handled by node-cron backend service
- Real-time updates via Socket.io (future feature)
