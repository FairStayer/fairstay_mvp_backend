import { Router, Request, Response } from 'express';
import multer from 'multer';
import Image from '../models/Image';
import { uploadToS3 } from '../services/s3Service';
import { analyzeImage } from '../services/aiService';

const router = Router();

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
    
    const image = await Image.findById(imageId);
    
    if (!image) {
      res.status(404).json({
        success: false,
        message: 'Image not found',
      });
      return;
    }
    
    if (image.damageAnalysis.status === 'processing' || image.damageAnalysis.status === 'completed') {
      res.json({
        success: true,
        status: image.damageAnalysis.status,
        damages: image.damageAnalysis.damages,
      });
      return;
    }
    
    await Image.update(imageId, {
      damageAnalysis: {
        ...image.damageAnalysis,
        status: 'processing',
      },
    });
    
    try {
      const analysisResult = await analyzeImage(image.imageUrl);
      
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
