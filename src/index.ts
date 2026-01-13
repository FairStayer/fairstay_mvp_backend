/**
 * FairStay MVP Backend - AWS Lambda Handler
 * 
 * API Gateway 설정:
 * - 엔드포인트: https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend
 * - 리소스 경로: /fairstay-mvp-backend
 * - 메서드: ANY
 * 
 * 환경 변수 필수 설정:
 * - S3_BUCKET_NAME: S3 버킷 이름
 * - DYNAMODB_TABLE_PREFIX: DynamoDB 테이블 접두사
 * - AI_SERVER_URL: AI 서버 URL
 * - AWS_REGION: ap-northeast-2 (자동 설정됨)
 */

import serverless from 'serverless-http';
import { connectDB } from './config/database';
import app from './app';

// DynamoDB 연결 상태
let isConnected = false;

/**
 * DynamoDB 연결 초기화
 * Lambda의 warm start 시 기존 연결 재사용
 */
const connectToDatabase = async (): Promise<void> => {
  if (isConnected) {
    console.log('♻️  Using existing DynamoDB connection');
    return;
  }
  
  console.log('🔌 Connecting to DynamoDB...');
  await connectDB();
  isConnected = true;
  console.log('✅ DynamoDB connected successfully');
};

/**
 * API Gateway 경로 정규화
 * /default/fairstay-mvp-backend/api/session -> /api/session
 * /fairstay-mvp-backend/api/session -> /api/session
 */
const normalizeApiGatewayPath = (event: any): any => {
  const basePaths = [
    '/default/fairstay-mvp-backend',  // API Gateway HTTP API with stage
    '/fairstay-mvp-backend',          // API Gateway without stage
  ];
  
  // HTTP API v2.0: rawPath 사용
  const originalPath = event.rawPath || event.path || event.requestContext?.http?.path || event.requestContext?.path;
  
  if (originalPath) {
    for (const basePath of basePaths) {
      if (originalPath.startsWith(basePath)) {
        const normalizedPath = originalPath.replace(basePath, '') || '/';
        console.log(`🔄 Path normalization: ${originalPath} -> ${normalizedPath}`);
        
        // HTTP API v2.0 포맷
        if (event.rawPath) {
          event.rawPath = normalizedPath;
        }
        // REST API v1.0 포맷
        if (event.path) {
          event.path = normalizedPath;
        }
        // requestContext.http.path (HTTP API v2.0)
        if (event.requestContext?.http?.path) {
          event.requestContext.http.path = normalizedPath;
        }
        // requestContext.path (REST API v1.0)
        if (event.requestContext?.path) {
          event.requestContext.path = normalizedPath;
        }
        break;
      }
    }
  }
  
  return event;
};

/**
 * 환경 변수 검증
 */
const validateEnvironment = (): { valid: boolean; missing: string[] } => {
  const required = ['S3_BUCKET_NAME', 'DYNAMODB_TABLE_PREFIX', 'AI_SERVER_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Lambda Handler
 * API Gateway HTTP API와 통합
 */
export const handler = async (
  event: any,
  context: any
): Promise<any> => {
  // 🔥 강제 이벤트 덤프 (타입 무시)
  console.log('📋 FULL EVENT DUMP:', JSON.stringify(event, null, 2));
  console.log('📋 EVENT KEYS:', Object.keys(event));
  console.log('📋 REQUEST CONTEXT:', JSON.stringify(event.requestContext, null, 2));
  
  // Lambda 콜드 스타트 로깅
  console.log('🚀 Lambda invoked:', {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    memoryLimit: context.memoryLimitInMB,
    method: event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod,
    path: event.path || event.rawPath || event.requestContext?.http?.path || event.requestContext?.resourcePath,
    routeKey: event.requestContext?.routeKey,
  });
  
  // Lambda 함수가 종료되어도 연결 유지 (warm start 최적화)
  context.callbackWaitsForEmptyEventLoop = false;
  
  // 환경 변수 검증
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    console.error('❌ Missing required environment variables:', envCheck.missing);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Server configuration error',
        error: `Missing environment variables: ${envCheck.missing.join(', ')}`,
      }),
    };
  }
  
  // DynamoDB 연결
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('❌ DynamoDB connection error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
  
  // API Gateway base path 정규화
  const normalizedEvent = normalizeApiGatewayPath(event);
  
  // Express 앱을 serverless-http로 래핑하여 실행
  try {
    const serverlessHandler = serverless(app, {
      binary: [
        'image/*',
        'application/pdf',
        'multipart/form-data'
      ],
      request(request: any, event: any) {
        // HTTP API v2.0 포맷 처리
        request.requestContext = event.requestContext;
      },
    });
    
    const result = await serverlessHandler(normalizedEvent, context) as any;
    
    console.log('✅ Request completed:', {
      statusCode: result.statusCode,
      path: normalizedEvent.path,
    });
    
    return result;
  } catch (error) {
    console.error('❌ Handler execution error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
