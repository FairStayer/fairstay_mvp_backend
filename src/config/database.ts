import { dynamoDB } from './aws';

// DynamoDB 테이블 이름
export const TABLES = {
  SESSIONS: process.env.DYNAMODB_SESSIONS_TABLE || 'FairStay-Sessions',
  IMAGES: process.env.DYNAMODB_IMAGES_TABLE || 'FairStay-Images',
  SURVEY_RESPONSES: process.env.DYNAMODB_SURVEY_TABLE || 'FairStay-SurveyResponses',
};

// DynamoDB 테이블 생성 (로컬 개발용)
export const createTablesIfNotExists = async (): Promise<void> => {
  const existingTables = await dynamoDB.listTables().promise();
  const tableNames = existingTables.TableNames || [];

  // Sessions 테이블
  if (!tableNames.includes(TABLES.SESSIONS)) {
    await dynamoDB.createTable({
      TableName: TABLES.SESSIONS,
      KeySchema: [
        { AttributeName: 'sessionId', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'sessionId', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }).promise();
    console.log(`DynamoDB Table Created: ${TABLES.SESSIONS}`);
  }

  // Images 테이블
  if (!tableNames.includes(TABLES.IMAGES)) {
    await dynamoDB.createTable({
      TableName: TABLES.IMAGES,
      KeySchema: [
        { AttributeName: 'imageId', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'imageId', AttributeType: 'S' },
        { AttributeName: 'sessionId', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'SessionIdIndex',
          KeySchema: [
            { AttributeName: 'sessionId', KeyType: 'HASH' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }).promise();
    console.log(`DynamoDB Table Created: ${TABLES.IMAGES}`);
  }

  // SurveyResponses 테이블
  if (!tableNames.includes(TABLES.SURVEY_RESPONSES)) {
    await dynamoDB.createTable({
      TableName: TABLES.SURVEY_RESPONSES,
      KeySchema: [
        { AttributeName: 'responseId', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'responseId', AttributeType: 'S' },
        { AttributeName: 'sessionId', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'SessionIdIndex',
          KeySchema: [
            { AttributeName: 'sessionId', KeyType: 'HASH' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }).promise();
    console.log(`DynamoDB Table Created: ${TABLES.SURVEY_RESPONSES}`);
  }
};

// DynamoDB 연결 확인
export const connectDB = async (): Promise<void> => {
  try {
    // DynamoDB 연결 테스트
    await dynamoDB.listTables().promise();
    console.log('DynamoDB Connected Successfully');
    
    // 로컬 환경에서만 테이블 자동 생성
    if (process.env.NODE_ENV === 'development' || process.env.CREATE_TABLES === 'true') {
      await createTablesIfNotExists();
    }
  } catch (error) {
    console.error(`DynamoDB Connection Error: ${(error as Error).message}`);
    console.log('⚠️  로컬 테스트 모드: DynamoDB 없이 계속 진행합니다.');
    // 로컬 테스트에서는 에러를 던지지 않음
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};
