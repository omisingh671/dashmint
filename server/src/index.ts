import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRouter from './routes/auth.js';
import adminsRouter from './routes/admins.js';
import dashboardsRouter from './routes/dashboards.js';
import assignmentsRouter from './routes/assignments.js';
import auditRouter from './routes/audit.js';
import queryRouter from './routes/query.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register routers
app.use('/api/auth', authRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/query', queryRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
