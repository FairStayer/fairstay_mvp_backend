import { documentClient } from '../config/aws';
import { TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type SurveyResponseType = 
  | 'very_helpful' 
  | 'helpful' 
  | 'neutral' 
  | 'not_helpful' 
  | 'not_needed';

export interface ISurveyResponse {
  responseId: string;
  sessionId: string;
  response: SurveyResponseType;
  additionalComments?: string;
  createdAt: number; // Unix timestamp
}

class SurveyResponseModel {
  private tableName = TABLES.SURVEY_RESPONSES;

  async create(data: Omit<ISurveyResponse, 'responseId' | 'createdAt'>): Promise<ISurveyResponse> {
    const surveyResponse: ISurveyResponse = {
      responseId: uuidv4(),
      ...data,
      createdAt: Date.now(),
    };

    await documentClient.put({
      TableName: this.tableName,
      Item: surveyResponse,
    }).promise();

    return surveyResponse;
  }

  async findById(responseId: string): Promise<ISurveyResponse | null> {
    const result = await documentClient.get({
      TableName: this.tableName,
      Key: { responseId },
    }).promise();

    return result.Item as ISurveyResponse || null;
  }

  async findAll(): Promise<ISurveyResponse[]> {
    const result = await documentClient.scan({
      TableName: this.tableName,
    }).promise();

    return (result.Items as ISurveyResponse[]) || [];
  }

  async findBySessionId(sessionId: string): Promise<ISurveyResponse[]> {
    const result = await documentClient.query({
      TableName: this.tableName,
      IndexName: 'SessionIdIndex',
      KeyConditionExpression: 'sessionId = :sessionId',
      ExpressionAttributeValues: {
        ':sessionId': sessionId,
      },
    }).promise();

    return (result.Items as ISurveyResponse[]) || [];
  }

  async delete(responseId: string): Promise<void> {
    await documentClient.delete({
      TableName: this.tableName,
      Key: { responseId },
    }).promise();
  }
}

export default new SurveyResponseModel();
