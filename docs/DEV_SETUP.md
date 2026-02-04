# Development Setup

## Quick Start (this one uses Docker)

### 1. Start PostgreSQL
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Backend runs on `http://localhost:3001`

### 3. Setup Frontend
```bash
cd ../client
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

## Manual Setup (w/o Docker)

### 1. Install PostgreSQL
- **macOS**: `brew install postgresql@15`
- **Linux**: `sudo apt-get install postgresql-15`

### 2. Create Database
```bash
createdb tasktogether_dev
```

### 3. Configure & Setup Backend
```bash
cd server
cp .env.example .env
# Edit DATABASE_URL in .env
npm install
npx prisma migrate dev --name init
npm run dev
```

### 4. Setup Frontend
```bash
cd ../client
npm install
npm run dev
```

## Commands

### Backend
```bash
npm run dev          # Development server with hot reload
npm run build        # Build TypeScript
npm start            # Run compiled version
npx prisma studio   # View database GUI
npx prisma migrate dev  # Run migrations
```

### Frontend
```bash
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

### Database
```bash
docker-compose up -d     # Start PostgreSQL
docker-compose down      # Stop PostgreSQL
npx prisma db push      # Sync schema to DB
npx prisma migrate reset # Reset database (deletes data)
```

## Troubleshooting

### Port Already in Use
- Backend (3001): Change `PORT` in `.env`
- Frontend (3000): Next.js will prompt for alternative
- Postgres (5433): Change port in `docker-compose.yml`

### Database Connection Failed
```bash
# Check if postgres is running
psql -U postgres -d household_dev

# With Docker
docker-compose ps
docker-compose logs postgres
```

### Prisma Issues
```bash
cd server
npx prisma generate
npx prisma migrate reset --force
```

### Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## Environment Variables

Create `.env` in the `server/` directory:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/tasktogether_dev"
JWT_SECRET="your-secret-key-change-in-production"
NODE_ENV="development"
PORT=3001
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
S3_BUCKET="household-images-dev"
```

See `server/.env.example` for all available options.

## Project Structure

```
├── client/              # Next.js 14 frontend
├── server/              # Express backend
├── database/            # Prisma schema
├── docs/                # Documentation
├── docker-compose.yml   # PostgreSQL container
├── DEV_SETUP.md        # This file
├── ARCHITECTURE.md      # System design
└── README.md           # Project overview
```

## Testing Setup

Visit `http://localhost:3000` - should show status checks for:
- ✓ Backend connected
- ✓ Database connected

Or test endpoints:
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/db-check
```

## Quick Start (Using Docker)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- npm or yarn

### 1. Start the Database
```bash
docker-compose up -d
# Wait for postgres to be healthy
```

### 2. Setup Backend
```bash
cd server
cp .env.example .env
# Edit .env if needed (defaults should work with docker postgres)

npm install
npx prisma migrate dev --name init
```

Backend will be available at: `http://localhost:3001`

### 3. Setup Frontend
```bash
cd ../client
npm install
npm run dev
```

Frontend will be available at: `http://localhost:3000`

### 4. Test Connection
Open `http://localhost:3000` in your browser. You should see:
- ✓ Backend Connected
- ✓ Database Connected

---

## Manual Setup (Without Docker)

### 1. Install PostgreSQL
- macOS: `brew install postgresql@15`
- Linux: `sudo apt-get install postgresql-15`
- Windows: Download from postgresql.org

### 2. Create Database
```bash
createdb household_dev
# Or create via psql:
# psql -U postgres
# CREATE DATABASE household_dev;
```

### 3. Configure Environment
```bash
cd server
cp .env.example .env
# Edit DATABASE_URL in .env to match your setup
# Default: postgresql://postgres:postgres@localhost:5432/household_dev
```

### 4. Setup Backend
```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

### 5. Setup Frontend (in new terminal)
```bash
cd client
npm install
npm run dev
```

---

## Commands

### Backend
```bash
npm run dev          # Development server with hot reload
npm run build        # Build TypeScript
npm start            # Run built version
npx prisma studio   # View/manage database via GUI
npx prisma migrate dev  # Run migrations
```

### Frontend
```bash
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Check code quality
npm run type-check   # TypeScript checking
```

### Database
```bash
# View schema changes
npx prisma db push

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## Troubleshooting

### Port Already in Use
- Backend (3001): Kill process or change PORT in .env
- Frontend (3000): Next.js will prompt for alternative port
- Postgres (5432): Change port mapping in docker-compose.yml

### Database Connection Failed
```bash
# Check postgres is running
psql -U postgres -d household_dev

# Or with docker:
docker-compose ps
docker-compose logs postgres
```

### Prisma Migration Errors
```bash
# Reset and start fresh
cd server
npx prisma migrate reset --force
npx prisma generate
```

### Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Project Structure

```
├── client/                 # Next.js 14 frontend
│   ├── src/app/           # App Router pages
│   ├── package.json
│   └── tailwind.config.js
├── server/                # Express backend
│   ├── src/
│   │   └── index.ts      # Entry point
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json

├── docs/                  # Documentation
├── docker-compose.yml     # Local dev environment
└── README.md
```

---

## Environment Variables

### Server (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for auth tokens
- `PORT`: Server port (default: 3001)
- `AWS_*`: AWS S3 credentials (for image uploads)
- `SMTP_*`: Email configuration

See `server/.env.example` for full template.

