import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'FairStay MVP Backend API',
    version: '1.0.0',
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Routes
import sessionRoutes from './routes/session';
import imageRoutes from './routes/image';
import shareRoutes from './routes/share';
import surveyRoutes from './routes/survey';

app.use('/api/session', sessionRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/survey', surveyRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Error:', err);
  
  if (err.message === 'Only image files are allowed') {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default app;
