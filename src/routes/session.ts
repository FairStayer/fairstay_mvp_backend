import { Router, Request, Response } from 'express';
import Session from '../models/Session';

const router = Router();

// 새 세션 생성
router.post('/create', async (_req: Request, res: Response): Promise<void> => {
  try {
    const session = await Session.create();
    
    res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      message: 'Session created successfully',
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: (error as Error).message,
    });
  }
});

// 세션 검증
router.get('/validate/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findBySessionId(sessionId);
    
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }
    
    await Session.updateLastActivity(sessionId);
    
    res.json({
      success: true,
      sessionId: session.sessionId,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate session',
      error: (error as Error).message,
    });
  }
});

export default router;
