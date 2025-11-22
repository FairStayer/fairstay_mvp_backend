import { Router, Request, Response } from 'express';
import SurveyResponse, { SurveyResponseType } from '../models/SurveyResponse';

const router = Router();

const validResponses: SurveyResponseType[] = ['very_helpful', 'helpful', 'neutral', 'not_helpful', 'not_needed'];

// 설문조사 응답 제출
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, response, additionalComments } = req.body;
    
    if (!sessionId || !response) {
      res.status(400).json({
        success: false,
        message: 'Session ID and response are required',
      });
      return;
    }
    
    if (!validResponses.includes(response)) {
      res.status(400).json({
        success: false,
        message: 'Invalid response value',
      });
      return;
    }
    
    await SurveyResponse.create({
      sessionId,
      response,
      additionalComments,
    });
    
    res.status(201).json({
      success: true,
      message: 'Survey response saved successfully',
    });
  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit survey',
      error: (error as Error).message,
    });
  }
});

// 설문조사 결과 조회
router.get('/results', async (_req: Request, res: Response): Promise<void> => {
  try {
    const responses = await SurveyResponse.findAll();
    
    // createdAt으로 정렬 (최신순)
    const sortedResponses = responses.sort((a, b) => b.createdAt - a.createdAt);
    
    const stats = {
      total: responses.length,
      breakdown: {
        very_helpful: 0,
        helpful: 0,
        neutral: 0,
        not_helpful: 0,
        not_needed: 0,
      },
    };
    
    responses.forEach(r => {
      stats.breakdown[r.response]++;
    });
    
    res.json({
      success: true,
      stats,
      responses: sortedResponses.map(r => ({
        sessionId: r.sessionId,
        response: r.response,
        additionalComments: r.additionalComments,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Survey results retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve survey results',
      error: (error as Error).message,
    });
  }
});

export default router;
