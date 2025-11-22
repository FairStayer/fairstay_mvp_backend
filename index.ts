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
import { connectDB } from './src/config/database';
import app from './src/app';
import { Handler, Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

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
 * /fairstay-mvp-backend/api/session -> /api/session
 */
const normalizeApiGatewayPath = (event: APIGatewayProxyEvent): APIGatewayProxyEvent => {
  const basePath = '/fairstay-mvp-backend';
  
  if (event.path && event.path.startsWith(basePath)) {
    console.log(`🔄 Path normalization: ${event.path} -> ${event.path.replace(basePath, '') || '/'}`);
    event.path = event.path.replace(basePath, '') || '/';
  }
  
  // requestContext.path도 정규화 (있는 경우)
  if (event.requestContext && 'path' in event.requestContext && typeof event.requestContext.path === 'string') {
    if (event.requestContext.path.startsWith(basePath)) {
      event.requestContext.path = event.requestContext.path.replace(basePath, '') || '/';
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
export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Lambda 콜드 스타트 로깅
  console.log('🚀 Lambda invoked:', {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    memoryLimit: context.memoryLimitInMB,
    method: event.httpMethod,
    path: event.path,
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
      binary: ['image/*', 'application/pdf'], // 바이너리 데이터 처리
    });
    
    const result = await serverlessHandler(normalizedEvent, context) as APIGatewayProxyResult;
    
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
