# FairStay MVP Backend - API Routes

**Base URL:** `https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend`

---

## 🏠 Root & Health

### `GET /`
- **설명:** API 기본 정보
- **응답:**
  ```json
  {
    "success": true,
    "message": "FairStay MVP Backend API",
    "version": "1.0.0"
  }
  ```

### `GET /health`
- **설명:** 서버 상태 체크
- **응답:**
  ```json
  {
    "success": true,
    "status": "healthy",
    "timestamp": "2026-01-13T07:00:00.000Z"
  }
  ```

---

## 📱 세션 관리 (`/api/session`)

### `POST /api/session/create`
- **설명:** 새 세션 생성
- **응답:**
  ```json
  {
    "success": true,
    "sessionId": "uuid",
    "expiresAt": 1768287600000
  }
  ```

### `GET /api/session/validate/:sessionId`
- **설명:** 세션 유효성 검증
- **파라미터:**
  - `sessionId` (path) - 세션 ID
- **응답:**
  ```json
  {
    "success": true,
    "valid": true,
    "session": {
      "sessionId": "uuid",
      "createdAt": 1768287600000,
      "expiresAt": 1768374000000
    }
  }
  ```

---

## 🖼️ 이미지 관리 (`/api/image`)

> **⚠️ 보안:** S3 버킷은 private 상태로 유지됩니다. Backend Lambda가 IAM 권한으로 S3에 접근합니다.

### `POST /api/image/presigned-url`
- **설명:** S3 업로드용 Presigned URL 생성 (1단계)
- **요청:**
  ```json
  {
    "sessionId": "uuid",
    "filename": "photo.jpg",
    "contentType": "image/jpeg"
  }
  ```
- **응답:**
  ```json
  {
    "success": true,
    "uploadUrl": "https://fairstay-mvp-s3.s3.amazonaws.com/...",
    "s3Key": "sessionId/uuid.jpg",
    "imageUrl": "https://fairstay-mvp-s3.s3.ap-northeast-2.amazonaws.com/...",
    "expiresIn": 300
  }
  ```

### `PUT <uploadUrl>` (S3 직접 업로드)
- **설명:** 받은 Presigned URL로 S3에 직접 업로드 (2단계)
- **요청:** 
  - Header: `Content-Type: image/jpeg`
  - Body: 이미지 파일 바이너리
- **cURL 예시:**
  ```bash
  curl -X PUT "<받은_uploadUrl>" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@photo.jpg"
  ```

### `POST /api/image/confirm`
- **설명:** 업로드 완료 확인 및 DB 저장 (3단계)
- **요청:**
  ```json
  {
    "sessionId": "uuid",
    "s3Key": "sessionId/uuid.jpg",
    "imageUrl": "https://fairstay-mvp-s3.s3.ap-northeast-2.amazonaws.com/..."
  }
  ```
- **응답:**
  ```json
  {
    "success": true,
    "imageId": "uuid",
    "imageUrl": "https://fairstay-mvp-s3.s3.ap-northeast-2.amazonaws.com/...",
    "message": "Image upload confirmed"
  }
  ```

### `POST /api/image/analyze/:imageId`
- **설명:** AI 이미지 분석 실행 (Backend Lambda가 S3에서 읽어서 AI Lambda로 전달)
- **파라미터:**
  - `imageId` (path) - 이미지 ID
- **응답 (분석 진행 중):**
  ```json
  {
    "success": true,
    "status": "processing",
    "damages": []
  }
  ```
- **응답 (분석 완료):**
  ```json
  {
    "success": true,
    "imageId": "uuid",
    "status": "completed",
    "processedImageUrl": "https://...",
    "damages": [
      {
        "type": "crack",
        "severity": "high",
        "location": "detected",
        "confidence": 0.93,
        "boundingBox": {
          "x": 100,
          "y": 150,
          "width": 200,
          "height": 180
        }
      }
    ]
  }
  ```

### `GET /api/image/:imageId`
- **설명:** 이미지 정보 및 분석 상태 조회
- **파라미터:**
  - `imageId` (path) - 이미지 ID
- **응답:**
  ```json
  {
    "success": true,
    "imageId": "uuid",
    "status": "completed",
    "processedImageUrl": "https://...",
    "damages": [
      {
        "type": "crack",
        "severity": "high",
        "location": "detected",
        "confidence": 0.93,
        "boundingBox": {
          "x": 100,
          "y": 150,
          "width": 200,
          "height": 180
        }
      }
    ]
  }
  ```

### `GET /api/image/:imageId`
- **설명:** 이미지 정보 및 분석 상태 조회
- **파라미터:**
  - `imageId` (path) - 이미지 ID
- **응답:**
  ```json
  {
    "success": true,
    "image": {
      "id": "uuid",
      "sessionId": "uuid",
      "imageUrl": "https://fairstay-mvp-s3.s3.ap-northeast-2.amazonaws.com/...",
      "processedImageUrl": "https://...",
      "damageAnalysis": {
        "status": "completed",
        "damages": [...],
        "processedAt": 1768287600000
      },
      "createdAt": 1768287600000
    }
  }
  ```
  - **status 값:**
    - `pending` - 분석 대기 중
    - `processing` - 분석 진행 중
    - `completed` - 분석 완료
    - `failed` - 분석 실패

### `GET /api/image/session/:sessionId`
- **설명:** 세션의 모든 이미지 조회
- **파라미터:**
  - `sessionId` (path) - 세션 ID
- **응답:**
  ```json
  {
    "success": true,
    "count": 2,
    "images": [
      {
        "id": "uuid",
        "sessionId": "uuid",
        "imageUrl": "https://fairstay-mvp-s3.s3.ap-northeast-2.amazonaws.com/...",
        "damageAnalysis": {
          "status": "completed",
          "damages": [...]
        },
        "createdAt": 1768287600000
      }
    ]
  }
  ```

---

## 🔗 공유 기능 (`/api/share`)

### `POST /api/share/generate/:imageId`
- **설명:** 공유 링크 생성
- **파라미터:**
  - `imageId` (path) - 이미지 ID
- **응답:**
  ```json
  {
    "success": true,
    "shareUrl": "https://fairstay.app/share/abc123",
    "shareId": "abc123",
    "expiresAt": 1768374000000
  }
  ```

### `POST /api/share/kakao-share/:imageId`
- **설명:** 카카오톡 공유용 데이터 생성
- **파라미터:**
  - `imageId` (path) - 이미지 ID
- **응답:**
  ```json
  {
    "success": true,
    "kakaoShareData": {
      "title": "하자 진단 결과",
      "description": "AI가 분석한 하자 진단 결과를 확인하세요",
      "imageUrl": "https://...",
      "shareUrl": "https://..."
    }
  }
  ```

---

## 📊 설문조사 (`/api/survey`)

### `POST /api/survey/submit`
- **설명:** 설문조사 제출
- **요청:**
  ```json
  {
    "sessionId": "uuid",
    "hasRealEstateExperience": true,
    "explanationRating": 4,
    "processConvenienceRating": 5,
    "overallSatisfactionRating": 4,
    "additionalComments": "입력 바랍니다. (선택)"
  }
  ```
  - **필수 필드:**
    - `sessionId` (string) - 세션 ID
    - `hasRealEstateExperience` (boolean) - Q1: 이전에 부동산 계약을 치뤄본 적이 있습니까?
    - `explanationRating` (number 1-5) - Q2: 리프트의 설명은 상세했나요?
    - `processConvenienceRating` (number 1-5) - Q3: 리프트 생성 과정은 편리했나요?
    - `overallSatisfactionRating` (number 1-5) - Q4: 전반적인 리프트의 만족도
  - **선택 필드:**
    - `additionalComments` (string) - Q5: 추가적인 의견
- **응답:**
  ```json
  {
    "success": true,
    "message": "Survey response saved successfully"
  }
  ```

### `GET /api/survey/results`
- **설명:** 전체 설문 결과 조회 (관리자용)
- **응답:**
  ```json
  {
    "success": true,
    "stats": {
      "total": 150,
      "hasRealEstateExperience": {
        "yes": 80,
        "no": 70
      },
      "averageRatings": {
        "explanation": 4.2,
        "processConvenience": 4.5,
        "overallSatisfaction": 4.3
      },
      "ratingDistribution": {
        "explanation": { "1": 2, "2": 5, "3": 20, "4": 60, "5": 63 },
        "processConvenience": { "1": 1, "2": 3, "3": 15, "4": 50, "5": 81 },
        "overallSatisfaction": { "1": 1, "2": 4, "3": 18, "4": 55, "5": 72 }
      }
    },
    "responses": [
      {
        "sessionId": "uuid",
        "hasRealEstateExperience": true,
        "explanationRating": 4,
        "processConvenienceRating": 5,
        "overallSatisfactionRating": 4,
        "additionalComments": "...",
        "createdAt": 1768287600000
      }
    ]
  }
  ```

---

## 📝 에러 응답 형식

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "success": false,
  "message": "에러 메시지",
  "error": "상세 에러 내용 (개발 모드에만)"
}
```

### 주요 HTTP 상태 코드

- `200` - 성공
- `201` - 생성 성공
- `400` - 잘못된 요청
- `404` - 리소스 없음
- `500` - 서버 내부 오류

---

## 🔧 환경 변수 (Lambda)

- `AI_SERVER_URL` - AI 서버 URL
- `S3_BUCKET_NAME` - S3 버킷 이름
- `DYNAMODB_TABLE_PREFIX` - DynamoDB 테이블 접두사
- `AWS_REGION` - AWS 리전 (ap-northeast-2)

---

## 📌 테스트 예시

### cURL 예시

```bash
# Health Check
curl https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/health

# 세션 생성
curl -X POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/session/create

# 이미지 업로드 (3단계)
# 1. Presigned URL 생성
curl -X POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/image/presigned-url \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "filename": "photo.jpg",
    "contentType": "image/jpeg"
  }'

# 2. S3에 직접 업로드 (받은 uploadUrl 사용)
curl -X PUT "<받은_uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@photo.jpg"

# 3. 업로드 완료 확인
curl -X POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/image/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "s3Key": "받은_s3Key",
    "imageUrl": "받은_imageUrl"
  }'

# 이미지 분석
curl -X POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/image/analyze/your-image-id

# 설문조사 제출
curl -X POST https://y0uhk6afg9.execute-api.ap-northeast-2.amazonaws.com/default/fairstay-mvp-backend/api/survey/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "hasRealEstateExperience": true,
    "explanationRating": 4,
    "processConvenienceRating": 5,
    "overallSatisfactionRating": 4,
    "additionalComments": "입력 바랍니다."
  }'
```

### JavaScript/React 클라이언트 예시

```javascript
async function uploadImage(sessionId, imageFile) {
  // 1. Presigned URL 요청
  const presignedRes = await fetch(`${BASE_URL}/api/image/presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      filename: imageFile.name,
      contentType: imageFile.type
    })
  });
  const { uploadUrl, s3Key, imageUrl } = await presignedRes.json();
  
  // 2. S3에 직접 업로드
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': imageFile.type },
    body: imageFile
  });
  
  // 3. 업로드 확인
  const confirmRes = await fetch(`${BASE_URL}/api/image/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, s3Key, imageUrl })
  });
  
  return await confirmRes.json();
}
```

---

**마지막 업데이트:** 2026-01-13
