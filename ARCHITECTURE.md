# Architecture

## System Overview

```
Frontend (Next.js 14)           Backend (Express)           Database (PostgreSQL)
┌──────────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│ React + TypeScript   │──────│ Node.js + Prisma │──────│ Multi-tenant Schema│
│ TailwindCSS          │ HTTP │ JWT Auth         │       │ Users              │
│ Real-time (Socket.io)│      │ Image Upload     │       │ Households         │
│                      │      │ Notifications    │       │ Tasks              │
└──────────────────────┘      └──────────────────┘       │ Issues             │
                                                         └────────────────────┘
```

## Data Model

The schema will be defined in [prisma/schema.prisma](./prisma/schema.prisma)

### Core Models

**User**
- id, email, name, password, avatar
- role (ADMIN, MEMBER)
- Belongs to one Household

**Household**
- id, name, ownerId
- Contains many Users (multi-tenant isolation)
- Contains Tasks, Issues, Rules

**Task**
- id, title, description, dueDate
- isRecurring, recurrencePattern
- Creator (User), Household
- Can be assigned to multiple users

**TaskAssignment**
- Links Task → User
- Tracks status (PENDING, IN_PROGRESS, COMPLETED, SKIPPED)
- Stores notification timestamp

**TaskCompletion**
- Evidence of completion (photo, notes, timestamp)
- User who completed, Task completed

**Issue**
- id, title, description, photoUrl
- status (OPEN, IN_PROGRESS, RESOLVED, ARCHIVED)
- reportedBy (User), household
- Can have multiple comments

**IssueComment**
- Resolution tracking with photo + notes
- Linked to Issue and User

**HouseholdRule**
- Documents agreements/expectations
- Simple key-value: title + description

## API Routes (To Implement)

```
/api/auth
  POST   /register
  POST   /login
  POST   /logout
  POST   /refresh

/api/households
  GET    /                    (user's household)
  POST   /
  PUT    /:id
  GET    /:id/members
  POST   /:id/members         (invite)
  DELETE /:id/members/:userId (remove)

/api/tasks
  GET    /                    (household tasks)
  POST   /
  PUT    /:id
  DELETE /:id
  POST   /:id/assign
  POST   /:id/complete        (with photo)
  GET    /:id/completions

/api/issues
  GET    /
  POST   /
  PUT    /:id
  DELETE /:id
  POST   /:id/comments
  PUT    /:id/status

/api/rules
  GET    /
  POST   /
/api/users/me
  GET    /
  PUT    /
  PUT    /avatar
```

## Key Features

- **Multi-tenant**: Each household has isolated data
- **JWT Authentication**: Stateless auth with household context
- **Image Upload**: Multer + Sharp for compression
- **Email Notifications**: Nodemailer for alerts
- **Recurring Tasks**: node-cron for scheduling
- **Real-time Updates**: Socket.io for live features
