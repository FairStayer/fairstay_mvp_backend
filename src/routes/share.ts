import { Router, Request, Response } from 'express';
import Image from '../models/Image';
import { generatePDF } from '../services/pdfService';

const router = Router();

// PDF 생성
router.post('/generate/:imageId', async (req: Request, res: Response): Promise<void> => {
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
    
    if (image.damageAnalysis.status !== 'completed') {
      res.status(400).json({
        success: false,
        message: 'Image analysis not completed yet',
      });
      return;
    }
    
    const pdfBuffer = await generatePDF(image);
    const pdfBase64 = pdfBuffer.toString('base64');
    
    res.json({
      success: true,
      pdf: pdfBase64,
      filename: `damage_report_${imageId}.pdf`,
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: (error as Error).message,
    });
  }
});

// 카카오톡 공유용 메타데이터 생성
router.post('/kakao-share/:imageId', async (req: Request, res: Response): Promise<void> => {
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
    
    if (image.damageAnalysis.status !== 'completed') {
      res.status(400).json({
        success: false,
        message: 'Image analysis not completed yet',
      });
      return;
    }
    
    const shareData = {
      title: '부동산 손상 리포트',
      description: `총 ${image.damageAnalysis.damages.length}개의 손상이 감지되었습니다.`,
      imageUrl: image.imageUrl,
      link: {
        webUrl: `${process.env.WEB_URL || 'https://fairstay.app'}/report/${imageId}`,
        mobileWebUrl: `${process.env.WEB_URL || 'https://fairstay.app'}/report/${imageId}`,
      },
    };
    
    res.json({
      success: true,
      shareData,
    });
  } catch (error) {
    console.error('Kakao share data generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate share data',
      error: (error as Error).message,
    });
  }
});

export default router;
