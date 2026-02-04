# Database

PostgreSQL setup and Prisma migrations.

## Setup

1. Install PostgreSQL 15+
2. Create a database:
   ```
   createdb household_dev
   ```

3. Update `../.env` with your DATABASE_URL

4. Run migrations:
   ```
   cd ../server
   npm install
   npx prisma migrate dev --name init
   ```

5. View the database:
   ```
   npx prisma studio
   ```

## Schema

See `schema.prisma` for the complete data model:
- **User**: Household members with roles and authentication
- **Household**: Shared living space with members and rules
- **Task**: Shared responsibilities with optional photo verification
- **TaskAssignment**: Task assignments to specific members
- **TaskCompletion**: Photo evidence and notes when tasks are completed
- **Issue**: No-blame problem reporting
- **IssueComment**: Resolution tracking with photos
- **HouseholdRule**: Documented agreements and expectations
