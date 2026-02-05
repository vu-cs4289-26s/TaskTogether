# Household Management Platform

## Project Overview

A mobile-first platform where households (roommates, families, partners) manage shared living without the drama. Solve communication breakdown, enable accountability without conflict, set healthy boundaries, eliminate blame culture, acknowledge invisible labor, preserve quality time, and break recurring chaos patterns.

## Core Features

### 1. Task System
- Create tasks with title, description, deadline
- Assign to household member or leave open
- Mark as recurring (weekly trash, monthly cleaning)
- Complete with photo verification (proof it's done/optional)
- Notifications on assignment and completion

### 2. Issue Reporting
- Report problems without assigning blame (leak, broke, ran out)
- Upload photo of the situation
- Everyone gets notified
- Track resolution with notes and photos
- Archive for future reference

### 3. Communication Hub
- Household-wide announcements
- Threaded discussions on specific topics
- @mention specific people
- Document household agreements/rules

### 4. Quality Time Scheduler (Family Mode)
- Schedule homework blocks with photo check-in
- Family bonding activities
- Balance dashboard (tasks vs quality time)
- Celebrate completions together

### 5. Household Dashboard
- At-a-glance view of what needs to be done today
- Who's responsible for what
- Recent completions (acknowledge work!)
- Active issues that need attention
- Stats/gamification (optional)

## Technology Stack

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Socket.io** (real-time updates)

### Backend
- **Node.js 20+**
- **Express/Fastify** (TypeScript)
- **Prisma ORM**
- **Multer + Sharp** (image upload/processing)
- **JWT** (authentication)
- **Nodemailer** (notifications)
- **node-cron** (recurring tasks)

### Database
- **PostgreSQL 15+**
- Multi-tenant architecture (household isolation)
- Relational design: users → households → tasks → completions

### Image Storage
- **AWS S3** (free tier during development)
- Compressed/resized on upload

### Deployment
- **AWS EC2**


### Infrastructure
- **Hosting**: AWS EC2
- **Storage**: S3 for images
- **CI/CD**: GitHub Actions



## Repository Structure

```
tasktogether/
├── client/
├── server/
├── docs/
└── scripts/
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed structure.



## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Setup Instructions

See [DEV_SETUP.md](./docs/DEV_SETUP.md) for complete setup and troubleshooting.

```bash
# Start database
docker-compose up -d

# Setup backend
cd server && cp .env.example .env && npm install && npx prisma migrate dev --name init && npm run dev

# In another terminal, setup frontend  
cd client && npm install && npm run dev

# Visit http://localhost:3000
```

## Documentation

- [DEV_SETUP.md](./docs/DEV_SETUP.md) - Setup, configuration, and troubleshooting
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design, data model, and API structure

## Team

### Current Members
- **Sahnnee**
- **Emily**
- **Van**


## Course Information

**Course**: CS 4289 - Project in Web-based Software Architecture    
**Institution**: Vanderbilt University  
**Semester**: Spring 2026  


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
