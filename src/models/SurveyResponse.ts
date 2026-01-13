import { documentClient } from '../config/aws';
import { TABLES } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface ISurveyResponse {
  responseId: string;
  sessionId: string;
  hasRealEstateExperience: boolean; // Q1: 이전에 부동산 계약을 치뤄본 적이 있습니까?
  explanationRating: number; // Q2: 리프트의 설명은 상세했나요? (1-5)
  processConvenienceRating: number; // Q3: 리프트 생성 과정은 편리했나요? (1-5)
  overallSatisfactionRating: number; // Q4: 전반적인 리프트의 만족도 (1-5)
  additionalComments?: string; // Q5: 추가적인 의견
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
