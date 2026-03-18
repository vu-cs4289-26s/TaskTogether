import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma.js';
import { initSocket } from './lib/socket.js';
import authRouter from './routes/auth.js';
import householdRouter from './routes/households.js';
import tasksRouter from './routes/tasks.js';
import issuesRouter from './routes/issues.js';
import activitiesRouter from './routes/activities.js';
import uploadRouter from './routes/upload.js';
import wikiRouter from './routes/wiki.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', authRouter);
app.use('/api/households', householdRouter);
app.use('/api/households/:id/tasks', tasksRouter);
app.use('/api/households/:id/issues', issuesRouter);
app.use('/api/households/:id/activities', activitiesRouter);
app.use('/api/households/:id/wiki', wikiRouter);
app.use('/api/upload', uploadRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Database connection check
app.get('/api/db-check', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'connected',
      database: 'PostgreSQL',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TaskTogether API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      dbCheck: '/api/db-check',
      auth: '/api/auth',
      households: '/api/households',
      tasks: '/api/households/:id/tasks',
      issues: '/api/households/:id/issues',
      activities: '/api/households/:id/activities',
      notifications: '/api/households/:id/tasks/notifications',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

// Start server — skipped in test mode (Supertest creates its own server)
if (process.env.NODE_ENV !== 'test') {
  const httpServer = createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`DB check: http://localhost:${PORT}/api/db-check`);
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server closed');
      process.exit(0);
    });
  });
}

export default app;
