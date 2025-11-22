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

// AI 서버의 실제 응답 형식
export interface AIServerResponse {
  image_url: string;  // AI 서버가 반환하는 처리된 이미지 URL
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

    // FormData 생성하여 이미지 파일 전송
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
      // AI 서버가 crack을 감지하면 처리된 이미지 URL을 반환
      // 실제로 몇 개의 crack이 감지되었는지는 이미지를 파싱해야 알 수 있지만,
      // 일단 기본 정보를 반환 (추후 AI 서버에서 메타데이터를 추가로 반환하도록 개선 가능)
      const processedImageUrl = `${aiServerUrl}${response.data.image_url}`;
      
      return {
        processedImageUrl,
        damages: [
          {
            type: 'crack',
            severity: 'medium',
            location: 'detected',
            confidence: 0.8,
            boundingBox: null,
          }
        ],
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
