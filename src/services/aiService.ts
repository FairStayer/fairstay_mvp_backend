import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIDamage {
  type: string;
  severity: string;
  location: string;
  confidence: number;
  bounding_box?: BoundingBox;
}

// AI 서버의 실제 응답 형식 (AI가 정의하는 Source of Truth)
export interface AIServerResponse {
  file_id: string;                // AI가 생성한 파일 ID
  image_url: string;              // AI 서버가 반환하는 처리된 이미지 URL (상대경로 또는 절대경로)
  has_crack: boolean;             // crack 감지 여부
  confidence: number;             // 신뢰도 (0.0 ~ 1.0)
  bounding_boxes?: BoundingBox[]; // 감지된 영역 (선택적)
}

export interface AnalysisResult {
  processedImageUrl?: string;  // AI가 처리한 이미지 URL
  damages: Array<{
    type: string;
    severity: string;
    location: string;
    confidence: number;
    boundingBox: BoundingBox | null;
  }>;
}

/**
 * AI 서버에 이미지 분석 요청
 * AI 서버는 /detect-crack 엔드포인트를 사용하고 multipart/form-data로 이미지 파일을 받음
 */
export const analyzeImage = async (imageUrl: string): Promise<AnalysisResult> => {
  try {
    const aiServerUrl = process.env.AI_SERVER_URL;
    
    if (!aiServerUrl) {
      throw new Error('AI_SERVER_URL is not configured');
    }

    // S3 이미지 URL에서 이미지를 다운로드
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    // FormData 생성하여 이미지 파일 전송 (필드명: 'image' - AI와 계약된 표준)
    const formData = new FormData();
    formData.append('image', Buffer.from(imageResponse.data), {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });

    // AI 서버의 /detect-crack 엔드포인트 호출
    const response: AxiosResponse<AIServerResponse> = await axios.post(
      `${aiServerUrl}/detect-crack`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000,
      }
    );
    
    if (response.data && response.data.image_url) {
      // AI 응답을 기준으로 백엔드 서비스 모델로 변환 (Backend = Translator)
      // URL 안전하게 조합 (상대경로/절대경로 모두 처리)
      const processedImageUrl = new URL(response.data.image_url, aiServerUrl).toString();
      
      // AI가 제공하는 실제 메타데이터 활용
      const damages = response.data.has_crack
        ? [
            {
              type: 'crack',
              severity: response.data.confidence > 0.8 ? 'high' : response.data.confidence > 0.5 ? 'medium' : 'low',
              location: 'detected',
              confidence: response.data.confidence,
              boundingBox: response.data.bounding_boxes && response.data.bounding_boxes.length > 0
                ? response.data.bounding_boxes[0]
                : null,
            },
          ]
        : [];
      
      return {
        processedImageUrl,
        damages,
      };
    }
    
    throw new Error('Invalid response from AI server');
  } catch (error: any) {
    console.error('AI analysis error:', error);
    
    if (error.response) {
      console.error('AI server response:', error.response.data);
      throw new Error(`AI server error: ${error.response.status} - ${error.response.statusText}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('AI server is not reachable');
    }
    
    throw new Error('Failed to analyze image with AI');
  }
};

/**
 * AI 서버 상태 확인
 */
export const checkAIServerHealth = async (): Promise<boolean> => {
  try {
    const aiServerUrl = process.env.AI_SERVER_URL;
    
    if (!aiServerUrl) {
      return false;
    }
    
    const response = await axios.get(`${aiServerUrl}/health`, {
      timeout: 5000,
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('AI server health check failed:', (error as Error).message);
    return false;
  }
};
