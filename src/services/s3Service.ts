import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// AWS SDK 설정
// Lambda 환경에서는 IAM 역할의 자격 증명이 자동으로 사용됩니다
AWS.config.update({
  region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-northeast-2',
});

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-northeast-2',
});

export interface UploadResult {
  imageUrl: string;
  s3Key: string;
}

export interface FileUpload {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

/**
 * S3에 이미지 업로드
 */
export const uploadToS3 = async (
  file: FileUpload,
  sessionId: string
): Promise<UploadResult> => {
  try {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${sessionId}/${uuidv4()}.${fileExtension}`;
    
    const params: AWS.S3.PutObjectRequest = {
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    
    const result = await s3.upload(params).promise();
    
    // ACL 대신 버킷 정책으로 public 접근 설정
    // 또는 Presigned URL 사용
    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || 'ap-northeast-2'}.amazonaws.com/${fileName}`;
    
    return {
      imageUrl,
      s3Key: result.Key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload image to S3');
  }
};

/**
 * S3에서 이미지 삭제
 */
export const deleteFromS3 = async (s3Key: string): Promise<boolean> => {
  try {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: s3Key,
    };
    
    await s3.deleteObject(params).promise();
    
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete image from S3');
  }
};

/**
 * S3에서 이미지 가져오기 (Presigned URL)
 */
export const getPresignedUrl = async (
  s3Key: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const params: AWS.S3.GetObjectRequest = {
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: s3Key,
    };
    
    const url = await s3.getSignedUrlPromise('getObject', {
      ...params,
      Expires: expiresIn,
    });
    
    return url;
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    throw new Error('Failed to generate presigned URL');
  }
};

/**
 * S3 업로드용 Presigned URL 생성
 */
export const generateUploadPresignedUrl = async (
  sessionId: string,
  filename: string,
  contentType: string,
  expiresIn: number = 300 // 5분
): Promise<{ uploadUrl: string; s3Key: string; imageUrl: string }> => {
  try {
    const fileExtension = filename.split('.').pop();
    const s3Key = `${sessionId}/${uuidv4()}.${fileExtension}`;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: s3Key,
      ContentType: contentType,
      Expires: expiresIn,
    };
    
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || 'ap-northeast-2'}.amazonaws.com/${s3Key}`;
    
    return {
      uploadUrl,
      s3Key,
      imageUrl,
    };
  } catch (error) {
    console.error('S3 upload presigned URL error:', error);
    throw new Error('Failed to generate upload presigned URL');
  }
};

export { s3 };
