# FairStay MVP Backend - Lambda 배포 가이드

## 📋 Lambda 함수 정보

- **함수명**: `fairstay-mvp-backend`
- **런타임**: Node.js 20.x
- **핸들러**: `index.handler`
- **메모리**: 512 MB (권장)
- **타임아웃**: 30초 (권장)
- **리전**: ap-northeast-2 (서울)

## 🔗 API Gateway 설정

- **API 이름**: fairstay-mvp-backend-API
- **API 엔드포인트**: `https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend`
- **리소스 경로**: `/fairstay-mvp-backend`
- **메서드**: ANY
- **스테이지**: default
- **API 유형**: HTTP
- **CORS**: 비활성화 (Lambda에서 처리)

## 🌐 API 엔드포인트 예시

### 기본 엔드포인트
```
https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/
```

### API 엔드포인트들
```
# Health Check
GET https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/health

# Session 생성
POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/session

# 이미지 업로드
POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/image/upload

# 설문조사 제출
POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/survey
```

## ⚙️ 필수 환경 변수 설정

AWS Lambda Console → 함수 선택 → **구성(Configuration)** → **환경 변수(Environment variables)** → **편집(Edit)**

### 1. S3 설정
```
키: S3_BUCKET_NAME
값: fairstay-mvp-s3 (실제 버킷 이름으로 변경)
설명: 이미지 저장용 S3 버킷
```

### 2. DynamoDB 설정
```
키: DYNAMODB_TABLE_PREFIX
값: fairstay-mvp-dynamo
설명: DynamoDB 테이블 접두사

사용되는 테이블:
- fairstay-mvp-dynamo_sessions
- fairstay-mvp-dynamo_images
- fairstay-mvp-dynamo_survey_responses
```

### 3. AI 서버 설정
```
키: AI_SERVER_URL
값: https://your-ai-lambda-url.lambda-url.ap-northeast-2.on.aws
설명: AI 이미지 분석 Lambda Function URL
```

### 4. 기타 설정 (선택사항)
```
키: NODE_ENV
값: production
설명: 실행 환경

키: AWS_REGION
값: ap-northeast-2
설명: AWS 리전 (Lambda에서 자동 설정됨)
```

## 🔐 IAM 권한 설정

Lambda 실행 역할에 다음 권한 필요:

### S3 권한
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObject"
  ],
  "Resource": "arn:aws:s3:::fairstay-mvp-s3/*"
}
```

### DynamoDB 권한
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:UpdateItem",
    "dynamodb:Query",
    "dynamodb:Scan"
  ],
  "Resource": [
    "arn:aws:dynamodb:ap-northeast-2:*:table/fairstay-mvp-dynamo_*"
  ]
}
```

### CloudWatch Logs 권한 (자동 포함)
```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "arn:aws:logs:ap-northeast-2:*:*"
}
```

## 📦 배포 단계

### 1. 코드 빌드 및 ZIP 생성
```bash
# 프로젝트 디렉토리로 이동
cd fairstay_mvp_backend

# 빌드 스크립트 실행
./build-lambda-zip.sh
```

**생성 파일**: `fairstay-mvp-backend-lambda.zip` (약 24MB)

### 2. Lambda 함수에 업로드

#### 방법 1: AWS Console (권장 - 50MB 이하)
1. Lambda Console 접속
2. `fairstay-mvp-backend` 함수 선택
3. **코드 소스** → **업로드** → **.zip 파일**
4. `fairstay-mvp-backend-lambda.zip` 선택
5. **저장** 클릭

### 3. 핸들러 설정 확인
**구성(Configuration)** → **런타임 설정(Runtime settings)** → **편집(Edit)**
- 핸들러: `index.handler` ✅

### 4. 환경 변수 설정
위의 "필수 환경 변수 설정" 섹션 참고

### 5. 메모리 및 타임아웃 설정
**구성(Configuration)** → **일반 구성(General configuration)** → **편집(Edit)**
- 메모리: `512 MB` (권장)
- 타임아웃: `30초` (권장)

## 🧪 테스트

### 1. AWS Console에서 테스트
Lambda Console → **테스트(Test)** 탭 → **새 이벤트 생성**

**테스트 이벤트 (API Gateway 시뮬레이션)**:
```json
{
  "httpMethod": "GET",
  "path": "/fairstay-mvp-backend/",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": null,
  "isBase64Encoded": false,
  "requestContext": {
    "accountId": "897722707561",
    "apiId": "y0uhk6afg9",
    "protocol": "HTTP/1.1",
    "httpMethod": "GET",
    "path": "/default/fairstay-mvp-backend/",
    "stage": "default",
    "requestId": "test-request-id",
    "requestTime": "22/Nov/2025:00:00:00 +0000",
    "requestTimeEpoch": 1700000000000,
    "identity": {
      "sourceIp": "127.0.0.1"
    }
  }
}
```

**예상 응답**:
```json
{
  "statusCode": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\"success\":true,\"message\":\"FairStay MVP Backend API\",\"version\":\"1.0.0\"}"
}
```

### 2. curl로 실제 엔드포인트 테스트
```bash
# 기본 엔드포인트
curl https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/

# Health Check
curl https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/health

# Session 생성
curl -X POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/session \
  -H "Content-Type: application/json"
```

## 📊 모니터링

### CloudWatch Logs
**모니터(Monitor)** → **CloudWatch에서 로그 보기(View logs in CloudWatch)**

로그 그룹: `/aws/lambda/fairstay-mvp-backend`

### 주요 로그 메시지
- `🚀 Lambda invoked:` - Lambda 시작
- `🔌 Connecting to DynamoDB...` - DB 연결 시작
- `✅ DynamoDB connected successfully` - DB 연결 성공
- `♻️  Using existing DynamoDB connection` - 기존 연결 재사용 (warm start)
- `🔄 Path normalization:` - 경로 정규화
- `✅ Request completed:` - 요청 완료

### 에러 로그
- `❌ Missing required environment variables:` - 환경 변수 누락
- `❌ DynamoDB connection error:` - DB 연결 실패
- `❌ Handler execution error:` - 핸들러 실행 오류

## 🚨 트러블슈팅

### 1. "Missing required environment variables" 에러
**원인**: 환경 변수가 설정되지 않음
**해결**: Lambda 환경 변수 설정 확인

### 2. "Database connection failed" 에러
**원인**: DynamoDB 테이블이 없거나 IAM 권한 부족
**해결**: 
- DynamoDB 테이블 생성 확인
- Lambda 실행 역할에 DynamoDB 권한 추가

### 3. "Cannot find module 'index'" 에러
**원인**: 핸들러 설정이 잘못됨
**해결**: 핸들러를 `index.handler`로 설정

### 4. API Gateway 404 에러
**원인**: 경로가 일치하지 않음
**해결**: 
- API Gateway 리소스 경로 확인: `/fairstay-mvp-backend`
- 엔드포인트 URL에 base path 포함 확인

### 5. CORS 에러
**원인**: CORS 헤더 누락
**해결**: Express 앱에서 CORS 설정 확인 (`src/app.ts`)

## 📝 체크리스트

배포 전 확인사항:

- [ ] S3 버킷 생성 완료
- [ ] DynamoDB 테이블 3개 생성 완료 (sessions, images, survey_responses)
- [ ] AI Lambda Function URL 준비
- [ ] Lambda 함수 생성 완료
- [ ] API Gateway 연결 완료
- [ ] IAM 역할에 S3, DynamoDB 권한 추가
- [ ] 환경 변수 3개 설정 완료 (S3_BUCKET_NAME, DYNAMODB_TABLE_PREFIX, AI_SERVER_URL)
- [ ] 핸들러 `index.handler`로 설정
- [ ] 메모리 512MB, 타임아웃 30초 설정
- [ ] ZIP 파일 업로드 완료
- [ ] 테스트 성공

## 🔄 업데이트 방법

코드 변경 후 재배포:

```bash
# 1. 빌드
./build-lambda-zip.sh

# 2. AWS Console에서 ZIP 재업로드
# 또는 CLI 사용:
aws lambda update-function-code \
  --function-name fairstay-mvp-backend \
  --zip-file fileb://fairstay-mvp-backend-lambda.zip \
  --region ap-northeast-2
```

## 📞 지원

문제 발생 시:
1. CloudWatch Logs 확인
2. Lambda 환경 변수 확인
3. IAM 권한 확인
4. API Gateway 설정 확인
