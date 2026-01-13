import { Router, Request, Response } from 'express';
import SurveyResponse from '../models/SurveyResponse';

const router = Router();

// 설문조사 응답 제출
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sessionId,
      hasRealEstateExperience,
      explanationRating,
      processConvenienceRating,
      overallSatisfactionRating,
      additionalComments
    } = req.body;
    
    // 필수 필드 검증
    if (!sessionId || hasRealEstateExperience === undefined) {
      res.status(400).json({
        success: false,
        message: 'sessionId and hasRealEstateExperience are required',
      });
      return;
    }
    
    // 점수 검증 (1-5)
    if (
      explanationRating < 1 || explanationRating > 5 ||
      processConvenienceRating < 1 || processConvenienceRating > 5 ||
      overallSatisfactionRating < 1 || overallSatisfactionRating > 5
    ) {
      res.status(400).json({
        success: false,
        message: 'Ratings must be between 1 and 5',
      });
      return;
    }
    
    await SurveyResponse.create({
      sessionId,
      hasRealEstateExperience,
      explanationRating,
      processConvenienceRating,
      overallSatisfactionRating,
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
    
    // 통계 계산
    const stats = {
      total: responses.length,
      hasRealEstateExperience: {
        yes: responses.filter(r => r.hasRealEstateExperience).length,
        no: responses.filter(r => !r.hasRealEstateExperience).length,
      },
      averageRatings: {
        explanation: responses.reduce((sum, r) => sum + r.explanationRating, 0) / responses.length || 0,
        processConvenience: responses.reduce((sum, r) => sum + r.processConvenienceRating, 0) / responses.length || 0,
        overallSatisfaction: responses.reduce((sum, r) => sum + r.overallSatisfactionRating, 0) / responses.length || 0,
      },
      ratingDistribution: {
        explanation: calculateRatingDistribution(responses, 'explanationRating'),
        processConvenience: calculateRatingDistribution(responses, 'processConvenienceRating'),
        overallSatisfaction: calculateRatingDistribution(responses, 'overallSatisfactionRating'),
      },
    };
    
    res.json({
      success: true,
      stats,
      responses: sortedResponses.map(r => ({
        sessionId: r.sessionId,
        hasRealEstateExperience: r.hasRealEstateExperience,
        explanationRating: r.explanationRating,
        processConvenienceRating: r.processConvenienceRating,
        overallSatisfactionRating: r.overallSatisfactionRating,
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

// 점수 분포 계산 헬퍼 함수
function calculateRatingDistribution(responses: any[], field: string) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  responses.forEach(r => {
    const rating = r[field];
    if (rating >= 1 && rating <= 5) {
      distribution[rating as keyof typeof distribution]++;
    }
  });
  return distribution;
}

export default router;
