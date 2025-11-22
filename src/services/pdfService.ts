import PDFDocument from 'pdfkit';
import { IImage } from '../models/Image';

/**
 * 손상 리포트 PDF 생성
 */
export const generatePDF = async (image: IImage): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });
      
      const buffers: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // 제목
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('부동산 손상 리포트', { align: 'center' });
      
      doc.moveDown();
      
      // 날짜
      doc.fontSize(12)
         .font('Helvetica')
         .text(`작성일: ${new Date(image.createdAt).toLocaleDateString('ko-KR')}`, { align: 'right' });
      
      doc.moveDown(2);
      
      // 이미지 정보
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('검사 이미지');
      
      doc.moveDown(0.5);
      
      // 이미지 URL
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('blue')
         .text(image.imageUrl, { link: image.imageUrl, underline: true });
      
      doc.fillColor('black');
      doc.moveDown(2);
      
      // 손상 분석 결과
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('손상 분석 결과');
      
      doc.moveDown(0.5);
      
      if (image.damageAnalysis.damages && image.damageAnalysis.damages.length > 0) {
        doc.fontSize(12)
           .font('Helvetica')
           .text(`총 ${image.damageAnalysis.damages.length}개의 손상이 감지되었습니다.`);
        
        doc.moveDown();
        
        // 각 손상 항목
        image.damageAnalysis.damages.forEach((damage, index) => {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${damage.type || '손상 유형 미상'}`);
          
          doc.fontSize(10)
             .font('Helvetica')
             .text(`   심각도: ${damage.severity || 'N/A'}`)
             .text(`   위치: ${damage.location || 'N/A'}`)
             .text(`   신뢰도: ${damage.confidence ? (damage.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
          
          doc.moveDown(0.5);
        });
      } else {
        doc.fontSize(12)
           .font('Helvetica')
           .text('손상이 감지되지 않았습니다.');
      }
      
      doc.moveDown(2);
      
      // 푸터
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('gray')
         .text('본 리포트는 AI 기반 자동 분석 결과이며, 참고용으로만 사용하시기 바랍니다.', { align: 'center' });
      
      doc.text('FairStay MVP - 부동산 손상 자동 감지 시스템', { align: 'center' });
      
      // PDF 생성 완료
      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(new Error('Failed to generate PDF'));
    }
  });
};
