import serverless from 'serverless-http';
import { connectDB } from './config/database';
import app from './app';
import { Handler, Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// DynamoDB 연결 상태
let isConnected = false;

const connectToDatabase = async (): Promise<void> => {
  if (isConnected) {
    console.log('Using existing DynamoDB connection');
    return;
  }
  
  await connectDB();
  isConnected = true;
};

// Lambda handler
export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event, context: Context): Promise<APIGatewayProxyResult> => {
  // Lambda 함수가 종료되어도 연결 유지
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('DynamoDB connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'DynamoDB connection failed',
      }),
    };
  }
  
  // serverless-http를 사용하여 Express 앱을 Lambda에서 실행
  const serverlessHandler = serverless(app);
  const result = await serverlessHandler(event, context);
  return result as APIGatewayProxyResult;
};
