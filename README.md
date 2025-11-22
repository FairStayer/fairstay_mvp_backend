# FairStay MVP Backend (TypeScript)

부동산 손상 자동 감지 및 리포트 생성 시스템의 백엔드 API (TypeScript + DynamoDB)

## 📋 프로젝트 개요

FairStay는 AI 기반 이미지 분석을 통해 부동산 손상을 자동으로 감지하고, 보고서를 생성하는 MVP 서비스입니다.

## 🏗 프로젝트 구조

```
fairstay_mvp_backend/
├── src/
│   ├── config/           # 설정 파일 (TypeScript)
│   │   ├── aws.ts
│   │   └── database.ts
│   ├── models/           # DynamoDB 모델 (TypeScript)
│   │   ├── Session.ts
│   │   ├── Image.ts
│   │   └── SurveyResponse.ts
│   ├── routes/           # API 라우트 (TypeScript)
│   │   ├── session.ts
│   │   ├── image.ts
│   │   ├── share.ts
│   │   └── survey.ts
│   ├── services/         # 비즈니스 로직 (TypeScript)
│   │   ├── s3Service.ts
│   │   ├── aiService.ts
│   │   └── pdfService.ts
│   ├── types/            # 타입 정의
│   │   ├── common.ts
│   │   └── express.d.ts
│   ├── app.ts            # Express 앱
│   ├── server.ts         # 로컬 서버
│   └── lambda.ts         # Lambda 핸들러
├── dist/                 # 컴파일된 JavaScript 파일
├── tests/                # 테스트 파일
├── tsconfig.json         # TypeScript 설정
├── jest.config.js        # Jest 설정
├── package.json
└── README.md
```

## 🚀 시작하기

### 1. 필수 요구사항

- Node.js >= 16.x
- TypeScript >= 5.x
- AWS 계정 (DynamoDB, S3, Lambda)
- AWS CLI 설정 완료

### 2. 설치

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 값들을 입력하세요
```

### 3. 환경변수 설정

`.env` 파일에 다음 값들을 설정하세요:

```env
# 서버 설정
PORT=3000
NODE_ENV=development

# AWS 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# DynamoDB 설정
DYNAMODB_SESSIONS_TABLE=FairStay-Sessions
DYNAMODB_IMAGES_TABLE=FairStay-Images
DYNAMODB_SURVEY_TABLE=FairStay-SurveyResponses
CREATE_TABLES=true  # 개발 환경에서 자동 테이블 생성

# S3 설정
S3_BUCKET_NAME=fairstay-images
S3_REGION=ap-northeast-2

# AI 서버 (FastAPI 서버 - /detect-crack 엔드포인트 제공)
AI_SERVER_URL=http://your-ai-server-url:8000
# 예: http://localhost:8000 (로컬) 또는 http://ec2-xx-xx-xx-xx.compute.amazonaws.com:8000 (배포)

# 웹 애플리케이션
WEB_URL=https://fairstay.app
```

**중요:** AI 서버는 FastAPI로 구현되어 있으며, `/detect-crack` 엔드포인트로 이미지 파일을 multipart/form-data 형식으로 받습니다.

### 4. DynamoDB 테이블 설정

개발 환경에서는 `CREATE_TABLES=true` 설정으로 자동 생성되지만, 
프로덕션 환경에서는 수동으로 테이블을 생성해야 합니다:

#### Sessions 테이블
- Partition Key: `sessionId` (String)
- TTL 속성: `ttl`
- Billing Mode: On-Demand

#### Images 테이블
- Partition Key: `imageId` (String)
- Global Secondary Index:
  - Index Name: `SessionIdIndex`
  - Partition Key: `sessionId` (String)
- Billing Mode: On-Demand

#### SurveyResponses 테이블
- Partition Key: `responseId` (String)
- Global Secondary Index:
  - Index Name: `SessionIdIndex`
  - Partition Key: `sessionId` (String)
- Billing Mode: On-Demand

### 5. 개발 및 실행

```bash
# TypeScript 빌드
npm run build

# 개발 모드 (hot reload)
npm run dev

# 프로덕션 모드
npm start
```

## 📦 TypeScript 빌드

```bash
# TypeScript 컴파일
npm run build

# 빌드 결과물 정리
npm run clean

# 정리 후 다시 빌드
npm run prebuild
```

빌드된 JavaScript 파일은 `dist/` 디렉토리에 생성됩니다.

## 🧪 테스트 실행

```bash
# 모든 테스트 실행
npm test

# Watch 모드
npm run test:watch

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration
```

## 📡 API 엔드포인트

### 세션 관리
- `POST /api/session/create` - 새 세션 생성
- `GET /api/session/validate/:sessionId` - 세션 검증

### 이미지 관리
- `POST /api/image/upload` - 이미지 업로드
- `POST /api/image/analyze/:imageId` - AI 이미지 분석
- `GET /api/image/:imageId` - 이미지 조회
- `GET /api/image/session/:sessionId` - 세션의 모든 이미지 조회

### 공유 기능
- `POST /api/share/generate/:imageId` - PDF 생성
- `POST /api/share/kakao-share/:imageId` - 카카오톡 공유 메타데이터

### 설문조사
- `POST /api/survey/submit` - 설문 응답 제출
- `GET /api/survey/results` - 설문 결과 조회

## 🔧 AWS Lambda 배포

### serverless.yml 설정

```yaml
service: fairstay-mvp-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: ap-northeast-2

functions:
  api:
    handler: dist/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
```

### 배포

```bash
# 빌드 후 배포
npm run build
serverless deploy
```

## 🎯 TypeScript 장점

### 1. 타입 안정성
```typescript
// 컴파일 타임에 에러 발견
const session: ISession = await Session.findById(sessionId);
if (session) {
  // session.sessionId는 string 타입 보장
  console.log(session.sessionId);
}
```

### 2. 인터페이스 정의
```typescript
export interface IImage extends Document {
  sessionId: string;
  imageUrl: string;
  s3Key: string;
  damageAnalysis: IDamageAnalysis;
  createdAt: Date;
}
```

### 3. 자동완성 및 IntelliSense
- IDE에서 완벽한 자동완성 지원
- 함수 시그니처 힌트
- 리팩토링 도구 지원

### 4. 에러 방지
```typescript
// 타입 미스매치 즉시 감지
async function uploadImage(file: FileUpload, sessionId: string): Promise<UploadResult> {
  // 파일 타입이 맞지 않으면 컴파일 에러
}
```

## 🛠 기술 스택

- **언어**: TypeScript 5.x
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Cloud**: AWS (S3, Lambda)
- **PDF Generation**: PDFKit
- **File Upload**: Multer
- **Testing**: Jest, Supertest, ts-jest

## 📝 개발 가이드

### 새로운 모델 추가

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface INewModel extends Document {
  field1: string;
  field2: number;
}

const newModelSchema = new Schema<INewModel>({
  field1: { type: String, required: true },
  field2: { type: Number, required: true },
});

export default mongoose.model<INewModel>('NewModel', newModelSchema);
```

### 새로운 서비스 추가

```typescript
export interface ServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const newService = async (param: string): Promise<ServiceResult> => {
  try {
    // 서비스 로직
    return { success: true, data: {} };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};
```

### 새로운 라우트 추가

```typescript
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 라우트 로직
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

export default router;
```

## 🐛 디버깅

### VS Code launch.json 예시

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/server.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## 📄 라이선스

ISC

## 👥 개발자

FairStay Team

---

**Note**: TypeScript로 전환하여 더욱 안정적이고 유지보수하기 쉬운 코드베이스가 되었습니다!
