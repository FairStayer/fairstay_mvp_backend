import AWS from 'aws-sdk';

// AWS SDK 설정
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.S3_REGION || process.env.AWS_REGION,
});

export const dynamoDB = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

export const documentClient = new AWS.DynamoDB.DocumentClient({
  service: dynamoDB,
  convertEmptyValues: true,
});

export { AWS };
