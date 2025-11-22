import { documentClient } from '../config/aws';
import { TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface IBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IDamage {
  type: string;
  severity: string;
  location: string;
  confidence: number;
  boundingBox?: IBoundingBox;
}

export interface IDamageAnalysis {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  damages: IDamage[];
  processedAt?: number; // Unix timestamp
}

export interface IImage {
  imageId: string;
  sessionId: string;
  imageUrl: string;
  s3Key: string;
  processedImageUrl?: string;  // AI 서버가 처리한 이미지 URL (crack 감지 결과가 표시된 이미지)
  damageAnalysis: IDamageAnalysis;
  createdAt: number; // Unix timestamp
}

class ImageModel {
  private tableName = TABLES.IMAGES;

  async create(data: Omit<IImage, 'imageId' | 'createdAt'>): Promise<IImage> {
    const image: IImage = {
      imageId: uuidv4(),
      ...data,
      createdAt: Date.now(),
    };

    await documentClient.put({
      TableName: this.tableName,
      Item: image,
    }).promise();

    return image;
  }

  async findById(imageId: string): Promise<IImage | null> {
    const result = await documentClient.get({
      TableName: this.tableName,
      Key: { imageId },
    }).promise();

    return result.Item as IImage || null;
  }

  async findBySessionId(sessionId: string): Promise<IImage[]> {
    const result = await documentClient.query({
      TableName: this.tableName,
      IndexName: 'SessionIdIndex',
      KeyConditionExpression: 'sessionId = :sessionId',
      ExpressionAttributeValues: {
        ':sessionId': sessionId,
      },
    }).promise();

    return (result.Items as IImage[]) || [];
  }

  async update(imageId: string, updates: Partial<IImage>): Promise<IImage | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'imageId' && value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    if (updateExpressions.length === 0) {
      return await this.findById(imageId);
    }

    const result = await documentClient.update({
      TableName: this.tableName,
      Key: { imageId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as IImage || null;
  }

  async updateDamageAnalysis(
    imageId: string,
    damageAnalysis: IDamageAnalysis
  ): Promise<IImage | null> {
    const result = await documentClient.update({
      TableName: this.tableName,
      Key: { imageId },
      UpdateExpression: 'SET damageAnalysis = :damageAnalysis',
      ExpressionAttributeValues: {
        ':damageAnalysis': damageAnalysis,
      },
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as IImage || null;
  }

  async delete(imageId: string): Promise<void> {
    await documentClient.delete({
      TableName: this.tableName,
      Key: { imageId },
    }).promise();
  }
}

export default new ImageModel();
