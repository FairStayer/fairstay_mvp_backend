import request from 'supertest';
import app from '../app';
import Session from '../models/Session';
import Image from '../models/Image';
import SurveyResponse from '../models/SurveyResponse';
import * as s3Service from '../services/s3Service';
import * as aiService from '../services/aiService';
import * as pdfService from '../services/pdfService';
import { documentClient } from '../config/aws';
import { TABLES } from '../config/database';

// Mock external services
jest.mock('../services/s3Service');
jest.mock('../services/aiService');
jest.mock('../services/pdfService');

// Mock AWS DynamoDB
jest.mock('../config/aws', () => ({
  documentClient: {
    put: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  },
  s3: {
    upload: jest.fn().mockReturnThis(),
    getSignedUrl: jest.fn(),
    deleteObject: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  },
  dynamoDB: {
    listTables: jest.fn().mockReturnThis(),
    createTable: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  },
}));

describe('FairStay MVP Backend - Complete Test Suite', () => {
  let sessionId: string;
  let imageId: string;

  // Setup: 테스트 전 Mock 설정
  beforeAll(async () => {
    // DynamoDB listTables mock (for connectDB)
    (documentClient as any).promise = jest.fn().mockResolvedValue({
      TableNames: [TABLES.SESSIONS, TABLES.IMAGES, TABLES.SURVEY_RESPONSES],
    });
  });

  // 각 테스트 전 Mock 초기화
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // DynamoDB operations mock setup
    (documentClient.put as any).mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
    (documentClient.get as any).mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: null }),
    });
    (documentClient.query as any).mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Items: [] }),
    });
    (documentClient.scan as any).mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Items: [] }),
    });
    (documentClient.update as any).mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Attributes: {} }),
    });
    (documentClient.delete as any).mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  // ========== Health Check ==========
  describe('GET / - Health Check', () => {
    it('should return API info', async () => {
      const res = await request(app).get('/');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('ProofIn');
    });

    it('should return health status', async () => {
      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('healthy');
    });
  });

  // ========== Session Management ==========
  describe('Session API', () => {
    it('should create a new session', async () => {
      const res = await request(app)
        .post('/api/session/create')
        .send();
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();
      
      sessionId = res.body.sessionId; // 다른 테스트에서 사용
    });

    it('should validate existing session', async () => {
      // 먼저 세션 생성
      const createRes = await request(app)
        .post('/api/session/create')
        .send();
      const testSessionId = createRes.body.sessionId;

      // 세션 검증
      const res = await request(app)
        .get(`/api/session/validate/${testSessionId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBe(testSessionId);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/session/validate/non-existent-id');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ========== Image Upload & Analysis ==========
  describe('Image API', () => {
    beforeEach(async () => {
      // 테스트용 세션 생성 mock
      sessionId = 'test-session-123';
      (documentClient.put as any).mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      // S3 업로드 mock
      (s3Service.uploadToS3 as jest.Mock).mockResolvedValue({
        imageUrl: 'https://s3.amazonaws.com/test-bucket/test-image.jpg',
        s3Key: 'test-image-key',
      });

      // AI 분석 mock
      (aiService.analyzeImage as jest.Mock).mockResolvedValue({
        damages: [
          {
            type: 'crack',
            severity: 'medium',
            location: 'wall',
            confidence: 0.85,
            boundingBox: { x: 100, y: 100, width: 50, height: 50 },
          },
        ],
      });
    });

    it('should upload an image', async () => {
      const res = await request(app)
        .post('/api/image/upload')
        .field('sessionId', sessionId)
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.imageId).toBeDefined();
      expect(res.body.imageUrl).toBeDefined();
      
      imageId = res.body.imageId;
    });

    it('should require sessionId for upload', async () => {
      const res = await request(app)
        .post('/api/image/upload')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should analyze an image', async () => {
      // 이미지 ID mock
      const testImageId = 'test-image-123';
      
      // DynamoDB get mock - 이미지 조회
      (documentClient.get as any).mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          Item: {
            imageId: testImageId,
            sessionId,
            imageUrl: 'https://s3.amazonaws.com/test.jpg',
            s3Key: 'test-key',
            damageAnalysis: {
              status: 'pending',
              damages: [],
            },
            createdAt: Date.now(),
          },
        }),
      });

      // DynamoDB update mock - 상태 업데이트
      (documentClient.update as any).mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Attributes: {
            imageId: testImageId,
            damageAnalysis: {
              status: 'completed',
              damages: [{
                type: 'crack',
                severity: 'medium',
                location: 'wall',
                confidence: 0.85,
                boundingBox: { x: 100, y: 100, width: 50, height: 50 },
              }],
              processedAt: Date.now(),
            },
          },
        }),
      });

      const res = await request(app)
        .post(`/api/image/analyze/${testImageId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('completed');
      expect(res.body.damages).toHaveLength(1);
    });

    it('should get image by ID', async () => {
      const testImageId = 'test-image-456';
      
      (documentClient.get as any).mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          Item: {
            imageId: testImageId,
            sessionId,
            imageUrl: 'https://s3.amazonaws.com/test.jpg',
            s3Key: 'test-key',
            damageAnalysis: {
              status: 'completed',
              damages: [],
              processedAt: Date.now(),
            },
            createdAt: Date.now(),
          },
        }),
      });

      const res = await request(app)
        .get(`/api/image/${testImageId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.image.imageUrl).toBe('https://s3.amazonaws.com/test.jpg');
    });

    it('should get images by session', async () => {
      // DynamoDB query mock - 세션별 이미지 조회
      (documentClient.query as any).mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          Items: [
            {
              imageId: 'image-1',
              sessionId,
              imageUrl: 'https://s3.amazonaws.com/test1.jpg',
              s3Key: 'test-key-1',
              damageAnalysis: { status: 'pending', damages: [] },
              createdAt: Date.now() - 1000,
            },
            {
              imageId: 'image-2',
              sessionId,
              imageUrl: 'https://s3.amazonaws.com/test2.jpg',
              s3Key: 'test-key-2',
              damageAnalysis: { status: 'completed', damages: [] },
              createdAt: Date.now(),
            },
          ],
        }),
      });

      const res = await request(app)
        .get(`/api/image/session/${sessionId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.images).toHaveLength(2);
    });
  });

  // ========== PDF Generation & Sharing ==========
  describe('Share API', () => {
    beforeEach(async () => {
      // PDF 생성 mock
      (pdfService.generatePDF as jest.Mock).mockResolvedValue(
        Buffer.from('fake-pdf-data')
      );

      // 완료된 분석이 있는 이미지 ID 설정
      imageId = 'completed-image-789';
      
      // DynamoDB get mock - 완료된 이미지
      (documentClient.get as any).mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            imageId,
            sessionId: 'test-session',
            imageUrl: 'https://s3.amazonaws.com/test.jpg',
            s3Key: 'test-key',
            damageAnalysis: {
              status: 'completed',
              damages: [
                {
                  type: 'crack',
                  severity: 'high',
                  location: 'wall',
                  confidence: 0.9,
                },
              ],
              processedAt: Date.now(),
            },
            createdAt: Date.now(),
          },
        }),
      });
    });

    it('should generate PDF report', async () => {
      const res = await request(app)
        .post(`/api/share/generate/${imageId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pdf).toBeDefined();
      expect(res.body.filename).toContain('damage_report');
    });

    it('should create Kakao share metadata', async () => {
      const res = await request(app)
        .post(`/api/share/kakao-share/${imageId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shareData).toBeDefined();
      expect(res.body.shareData.title).toContain('리포트');
    });

    it('should not generate PDF for incomplete analysis', async () => {
      const pendingImageId = 'pending-image-999';
      
      // DynamoDB get mock - 미완료 이미지
      (documentClient.get as any).mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          Item: {
            imageId: pendingImageId,
            sessionId: 'test-session',
            imageUrl: 'https://s3.amazonaws.com/test.jpg',
            s3Key: 'test-key',
            damageAnalysis: {
              status: 'pending',
              damages: [],
            },
            createdAt: Date.now(),
          },
        }),
      });

      const res = await request(app)
        .post(`/api/share/generate/${pendingImageId}`);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ========== Survey ==========
  describe('Survey API', () => {
    it('should submit survey response', async () => {
      const res = await request(app)
        .post('/api/survey/submit')
        .send({
          sessionId: 'test-session',
          response: 'very_helpful',
          additionalComments: 'Great service!',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should validate response type', async () => {
      const res = await request(app)
        .post('/api/survey/submit')
        .send({
          sessionId: 'test-session',
          response: 'invalid_response',
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should get survey results', async () => {
      // DynamoDB scan mock - 모든 설문 응답
      (documentClient.scan as any).mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          Items: [
            {
              responseId: 'response-1',
              sessionId: 'session-1',
              response: 'very_helpful',
              createdAt: Date.now() - 2000,
            },
            {
              responseId: 'response-2',
              sessionId: 'session-2',
              response: 'helpful',
              createdAt: Date.now() - 1000,
            },
            {
              responseId: 'response-3',
              sessionId: 'session-3',
              response: 'very_helpful',
              createdAt: Date.now(),
            },
          ],
        }),
      });

      const res = await request(app)
        .get('/api/survey/results');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.total).toBe(3);
      expect(res.body.stats.breakdown.very_helpful).toBe(2);
      expect(res.body.stats.breakdown.helpful).toBe(1);
    });
  });

  // ========== Error Handling ==========
  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app)
        .get('/api/unknown-route');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should handle invalid MongoDB ObjectId', async () => {
      // DynamoDB에서는 잘못된 ID도 처리 가능하지만 Item이 없으면 404
      (documentClient.get as any).mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ Item: null }),
      });
      
      const res = await request(app)
        .get('/api/image/invalid-id');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ========== Integration Test ==========
  describe('Complete Workflow Integration', () => {
    beforeEach(() => {
      // S3 업로드와 AI 분석 mock 설정
      (s3Service.uploadToS3 as jest.Mock).mockResolvedValue({
        imageUrl: 'https://s3.amazonaws.com/integration-test.jpg',
        s3Key: 'integration-test-key',
      });

      (aiService.analyzeImage as jest.Mock).mockResolvedValue({
        damages: [
          {
            type: 'crack',
            severity: 'high',
            location: 'ceiling',
            confidence: 0.92,
            boundingBox: { x: 50, y: 50, width: 100, height: 100 },
          },
        ],
      });

      (pdfService.generatePDF as jest.Mock).mockResolvedValue(
        Buffer.from('integration-pdf-data')
      );
    });

    it('should complete full user journey', async () => {
      // 1. 세션 생성
      const sessionRes = await request(app)
        .post('/api/session/create')
        .send();
      expect(sessionRes.status).toBe(201);
      const testSessionId = sessionRes.body.sessionId;

      // 2. 이미지 업로드
      const uploadRes = await request(app)
        .post('/api/image/upload')
        .field('sessionId', testSessionId)
        .attach('image', Buffer.from('fake-image'), 'test.jpg');
      expect(uploadRes.status).toBe(201);
      const testImageId = uploadRes.body.imageId;

      // 3. AI 분석
      const analyzeRes = await request(app)
        .post(`/api/image/analyze/${testImageId}`);
      expect(analyzeRes.status).toBe(200);
      expect(analyzeRes.body.status).toBe('completed');

      // 4. PDF 생성
      const pdfRes = await request(app)
        .post(`/api/share/generate/${testImageId}`);
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.body.pdf).toBeDefined();

      // 5. 설문 제출
      const surveyRes = await request(app)
        .post('/api/survey/submit')
        .send({
          sessionId: testSessionId,
          response: 'very_helpful',
          additionalComments: 'Perfect workflow!',
        });
      expect(surveyRes.status).toBe(201);

      // 6. 세션 검증
      const validateRes = await request(app)
        .get(`/api/session/validate/${testSessionId}`);
      expect(validateRes.status).toBe(200);
      expect(validateRes.body.sessionId).toBe(testSessionId);
    });
  });
});
