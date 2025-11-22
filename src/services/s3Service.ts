import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// AWS SDK 설정
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: process.env.S3_REGION || process.env.AWS_REGION,
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
      ACL: 'public-read',
    };
    
    const result = await s3.upload(params).promise();
    
    return {
      imageUrl: result.Location,
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

export { s3 };
