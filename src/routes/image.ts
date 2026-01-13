import { Router, Request, Response } from 'express';
import multer from 'multer';
import Image from '../models/Image';
import { uploadToS3, generateUploadPresignedUrl } from '../services/s3Service';
import { analyzeImage } from '../services/aiService';

const router = Router();

// Presigned URL 생성 (클라이언트가 직접 S3에 업로드)
router.post('/presigned-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, filename, contentType } = req.body;
    
    if (!sessionId || !filename || !contentType) {
      res.status(400).json({
        success: false,
        message: 'sessionId, filename, and contentType are required',
      });
      return;
    }
    
    const { uploadUrl, s3Key, imageUrl } = await generateUploadPresignedUrl(
      sessionId,
      filename,
      contentType
    );
    
    res.json({
      success: true,
      uploadUrl,
      s3Key,
      imageUrl,
      expiresIn: 300, // 5분
    });
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate presigned URL',
      error: (error as Error).message,
    });
  }
});

// 업로드 완료 확인 (DB에 이미지 정보 저장)
router.post('/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, s3Key, imageUrl } = req.body;
    
    if (!sessionId || !s3Key || !imageUrl) {
      res.status(400).json({
        success: false,
        message: 'sessionId, s3Key, and imageUrl are required',
      });
      return;
    }
    
    const image = await Image.create({
      sessionId,
      imageUrl,
      s3Key,
      damageAnalysis: {
        status: 'pending',
        damages: [],
      },
    });
    
    res.status(201).json({
      success: true,
      imageId: image.imageId,
      imageUrl,
      message: 'Image upload confirmed',
    });
  } catch (error) {
    console.error('Image confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm image upload',
      error: (error as Error).message,
    });
  }
});

// Multer 메모리 스토리지 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// 이미지 업로드
router.post('/upload', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🖼️ Upload request received');
    console.log('📦 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Body keys:', Object.keys(req.body));
    console.log('📦 Body:', JSON.stringify(req.body).substring(0, 200));
    console.log('📦 File:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : 'NO FILE');
    
    const { sessionId } = req.body;
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
      return;
    }
    
    const { imageUrl, s3Key } = await uploadToS3(req.file, sessionId);
    
    const image = await Image.create({
      sessionId,
      imageUrl,
      s3Key,
      damageAnalysis: {
        status: 'pending',
        damages: [],
      },
    });
    
    res.status(201).json({
      success: true,
      imageId: image.imageId,
      imageUrl,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: (error as Error).message,
    });
  }
});

// AI 이미지 분석
router.post('/analyze/:imageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageId } = req.params;
    console.log('🔍 AI 분석 요청:', imageId);
    
    const image = await Image.findById(imageId);
    
    if (!image) {
      console.log('❌ 이미지를 찾을 수 없음:', imageId);
      res.status(404).json({
        success: false,
        message: 'Image not found',
      });
      return;
    }
    
    console.log('📊 현재 이미지 상태:', {
      imageId: image.imageId,
      s3Key: image.s3Key,
      status: image.damageAnalysis.status,
    });
    
    if (image.damageAnalysis.status === 'processing' || image.damageAnalysis.status === 'completed') {
      console.log('⏭️  이미 처리 중이거나 완료된 이미지:', image.damageAnalysis.status);
      res.json({
        success: true,
        status: image.damageAnalysis.status,
        damages: image.damageAnalysis.damages,
      });
      return;
    }
    
    console.log('🔄 상태를 processing으로 변경 중...');
    await Image.update(imageId, {
      damageAnalysis: {
        ...image.damageAnalysis,
        status: 'processing',
      },
    });
    
    try {
      console.log('🤖 AI 서버 호출 시작:', {
        s3Key: image.s3Key,
        aiServerUrl: process.env.AI_SERVER_URL,
      });
      // Backend Lambda가 S3에서 직접 읽어서 AI Lambda로 전달 (IAM 권한 사용)
      const analysisResult = await analyzeImage(image.s3Key);
      console.log('✅ AI 분석 결과 받음:', analysisResult);
      
      // processedImageUrl도 함께 업데이트
      await Image.update(imageId, {
        processedImageUrl: analysisResult.processedImageUrl,
      });
      
      const updatedImage = await Image.updateDamageAnalysis(imageId, {
        status: 'completed',
        damages: analysisResult.damages.map(damage => ({
          type: damage.type,
          severity: damage.severity,
          location: damage.location,
          confidence: damage.confidence,
          boundingBox: damage.boundingBox || undefined,
        })),
        processedAt: Date.now(),
      });
      
      res.json({
        success: true,
        imageId: updatedImage!.imageId,
        status: 'completed',
        processedImageUrl: analysisResult.processedImageUrl,
        damages: updatedImage!.damageAnalysis.damages,
      });
    } catch (aiError) {
      await Image.updateDamageAnalysis(imageId, {
        status: 'failed',
        damages: [],
      });
      throw aiError;
    }
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze image',
      error: (error as Error).message,
    });
  }
});

// 이미지 정보 조회
router.get('/:imageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageId } = req.params;
    
    const image = await Image.findById(imageId);
    
    if (!image) {
      res.status(404).json({
        success: false,
        message: 'Image not found',
      });
      return;
    }
    
    res.json({
      success: true,
      image: {
        id: image.imageId,
        sessionId: image.sessionId,
        imageUrl: image.imageUrl,
        processedImageUrl: image.processedImageUrl,
        damageAnalysis: image.damageAnalysis,
        createdAt: image.createdAt,
      },
    });
  } catch (error) {
    console.error('Image retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve image',
      error: (error as Error).message,
    });
  }
});

// 세션의 모든 이미지 조회
router.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    const images = await Image.findBySessionId(sessionId);
    
    res.json({
      success: true,
      count: images.length,
      images: images.map(img => ({
        id: img.imageId,
        sessionId: img.sessionId,
        imageUrl: img.imageUrl,
        damageAnalysis: img.damageAnalysis,
        createdAt: img.createdAt,
      })).sort((a, b) => b.createdAt - a.createdAt), // 최신순 정렬
    });
  } catch (error) {
    console.error('Images retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve images',
      error: (error as Error).message,
    });
  }
});

export default router;
