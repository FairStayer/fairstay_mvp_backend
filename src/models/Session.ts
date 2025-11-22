import { documentClient } from '../config/aws';
import { TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface ISession {
  sessionId: string;
  createdAt: number; // Unix timestamp
  lastActivity: number; // Unix timestamp
  ttl?: number; // TTL for DynamoDB (24시간 후 자동 삭제)
}

class SessionModel {
  private tableName = TABLES.SESSIONS;

  async create(sessionId?: string): Promise<ISession> {
    const now = Date.now();
    const session: ISession = {
      sessionId: sessionId || uuidv4(),
      createdAt: now,
      lastActivity: now,
      ttl: Math.floor(now / 1000) + 86400, // 24시간 TTL
    };

    await documentClient.put({
      TableName: this.tableName,
      Item: session,
    }).promise();

    return session;
  }

  async findBySessionId(sessionId: string): Promise<ISession | null> {
    const result = await documentClient.get({
      TableName: this.tableName,
      Key: { sessionId },
    }).promise();

    return result.Item as ISession || null;
  }

  async updateLastActivity(sessionId: string): Promise<ISession | null> {
    const now = Date.now();
    const result = await documentClient.update({
      TableName: this.tableName,
      Key: { sessionId },
      UpdateExpression: 'SET lastActivity = :now, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':now': now,
        ':ttl': Math.floor(now / 1000) + 86400,
      },
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as ISession || null;
  }

  async delete(sessionId: string): Promise<void> {
    await documentClient.delete({
      TableName: this.tableName,
      Key: { sessionId },
    }).promise();
  }
}

export default new SessionModel();
