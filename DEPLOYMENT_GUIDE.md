# FairStay MVP 완전 배포 가이드 (AWS 콘솔 수동 배포)

이 가이드는 **AWS 웹 콘솔을 사용**하여 FairStay MVP를 수동으로 배포하고 Release APK를 생성하는 전체 과정을 설명합니다.

---

## 📋 사전 준비사항

### 필수 도구
- [ ] AWS 계정 (https://aws.amazon.com)
- [ ] Node.js 18+ 설치
- [ ] Python 3.10+ 설치
- [ ] Docker Desktop 설치
- [ ] Android Studio 설치
- [ ] Java JDK 11+ (keytool용)

### AWS 계정 준비
- [ ] AWS 계정 생성 완료
- [ ] **서울 리전(ap-northeast-2)** 선택
- [ ] 루트 계정 또는 관리자 권한으로 로그인

---

## 🚀 배포 순서 (총 9단계)

### 1단계: S3 버킷 생성 (이미지 저장소)

#### AWS 콘솔에서 S3 생성

1. **AWS Console 접속**: https://console.aws.amazon.com
2. **서비스 검색**: "S3" 입력
3. **버킷 만들기** 클릭
4. **버킷 설정**:
   - 버킷 이름: `fairstay-mvp-s3` (전 세계에서 고유해야 함, 숫자 추가 가능: fairstay-mvp-s3-20231122)
   - 리전: **아시아 태평양(서울) ap-northeast-2**
   - 객체 소유권: **ACL 비활성화됨(권장)**
   - 퍼블릭 액세스 차단 설정: **모든 퍼블릭 액세스 차단** (체크 유지)
5. **버킷 만들기** 클릭

#### CORS 설정 (Lambda에서 접근 허용)

1. 생성한 버킷 클릭 → **권한** 탭
2. **CORS(Cross-Origin Resource Sharing)** → **편집** 클릭
3. 다음 내용 복사 붙여넣기:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

4. **변경 사항 저장** 클릭

✅ **완료**: S3 버킷 이름을 메모하세요! (예: `fairstay-mvp-s3` 또는 `fairstay-mvp-s3-20231122`)

---

### 2단계: DynamoDB 테이블 생성 (3개)

#### Sessions 테이블 생성

1. **AWS Console** → 서비스 검색 → **DynamoDB** 입력
2. **테이블 생성** 클릭
3. **테이블 설정**:
   - 테이블 이름: `fairstay-mvp-dynamo_sessions`
   - 파티션 키: `sessionId` (데이터 유형: **문자열**)
   - 테이블 설정: **기본 설정 사용**
   - 읽기/쓰기 용량 모드: **온디맨드**
4. **테이블 생성** 클릭

#### Images 테이블 생성

1. **테이블 생성** 클릭
2. **테이블 설정**:
   - 테이블 이름: `fairstay-mvp-dynamo_images`
   - 파티션 키: `imageId` (데이터 유형: **문자열**)
   - 테이블 설정: **기본 설정 사용**
   - 읽기/쓰기 용량 모드: **온디맨드**
3. **테이블 생성** 클릭

#### SurveyResponses 테이블 생성

1. **테이블 생성** 클릭
2. **테이블 설정**:
   - 테이블 이름: `fairstay-mvp-dynamo_survey_responses`
   - 파티션 키: `responseId` (데이터 유형: **문자열**)
   - 테이블 설정: **기본 설정 사용**
   - 읽기/쓰기 용량 모드: **온디맨드**
3. **테이블 생성** 클릭

✅ **완료**: 3개 테이블 생성 완료 (`fairstay-mvp-dynamo_sessions`, `fairstay-mvp-dynamo_images`, `fairstay-mvp-dynamo_survey_responses`)

---

### 3단계: ECR 리포지토리 생성 (AI Docker 이미지 저장소)

1. **AWS Console** → 서비스 검색 → **ECR** 입력
2. **시작하기** 또는 **리포지토리 생성** 클릭
3. **리포지토리 설정**:
   - 표시 여부 설정: **프라이빗**
   - 리포지토리 이름: `fairstay-ai`
   - 태그 변경 불가능: 비활성화 (기본값)
   - 푸시 시 스캔: 활성화 (선택사항)
   - KMS 암호화: 비활성화 (기본값)
4. **리포지토리 생성** 클릭
5. 생성 후 **URI 복사**:
   - 예: `123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/fairstay-ai`

✅ **완료**: ECR URI를 메모하세요!

---

### 4단계: AI Lambda Docker 이미지 빌드 및 푸시

이 단계는 **터미널에서** 수행합니다.

#### AWS CLI 설치 (아직 없다면)

macOS:
```bash
brew install awscli
```

또는 https://aws.amazon.com/cli/ 에서 다운로드

#### AWS CLI 구성

```bash
aws configure
```

입력 정보:
- AWS Access Key ID: (AWS Console → IAM → 보안 자격 증명에서 생성)
- AWS Secret Access Key: (위에서 함께 생성됨)
- Default region name: `ap-northeast-2`
- Default output format: `json`

#### ECR 로그인

```bash
# AWS 계정 ID 확인: AWS Console 우측 상단 계정 번호
# 예: 123456789012

# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com
```

**로그인 성공**: `Login Succeeded`

#### Docker 이미지 빌드 및 푸시

```bash
cd fairstay_mvp_ai

# Docker 이미지 빌드 (5-10분 소요)
docker build -t fairstay-ai .

# 태그 지정 (AWS_ACCOUNT_ID를 실제 계정 ID로 변경!)
docker tag fairstay-ai:latest \
  <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/fairstay-ai:latest

# ECR에 푸시 (5-10분 소요)
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/fairstay-ai:latest
```

**자동 배포 스크립트 사용 (권장):**

```bash
cd fairstay_mvp_ai

# 스크립트 편집: AWS_ACCOUNT_ID 수정
nano deploy-lambda.sh
# Line 3: AWS_ACCOUNT_ID="123456789012"  <- 본인 계정 ID 입력

# 실행 권한 부여
chmod +x deploy-lambda.sh

# 실행
./deploy-lambda.sh
```

✅ **완료**: ECR에 Docker 이미지 푸시 완료

---

### 5단계: AI Lambda 함수 생성 (AWS 콘솔)

#### IAM 역할 생성 (Lambda 실행 역할)

1. **AWS Console** → **IAM** 검색
2. 좌측 메뉴 → **역할** → **역할 생성** 클릭
3. **신뢰할 수 있는 엔터티 선택**:
   - 신뢰할 수 있는 엔터티 유형: **AWS 서비스**
   - 사용 사례: **Lambda** 선택
4. **다음** 클릭
5. **권한 추가** (검색창에서 검색 후 체크):
   - `AWSLambdaBasicExecutionRole` (CloudWatch 로그용)
6. **다음** 클릭
7. **역할 이름**: `lambda-ai-execution-role`
8. **역할 생성** 클릭

✅ **완료**: IAM 역할 생성 완료

#### AI Lambda 함수 생성

1. **AWS Console** → **Lambda** 검색
2. **함수 생성** 클릭
3. **함수 설정**:
   - 옵션: **컨테이너 이미지**
   - 함수 이름: `fairstay-ai`
   - 컨테이너 이미지 URI:
     - **이미지 찾아보기** 클릭
     - `fairstay-ai` 리포지토리 선택
     - 이미지 태그: `latest` 선택
     - **이미지 선택** 클릭
   - 아키텍처: **x86_64**
   - 권한 → 실행 역할: **기존 역할 사용**
   - 기존 역할: `lambda-ai-execution-role` 선택
4. **함수 생성** 클릭 (30초 소요)

#### Lambda 메모리 및 타임아웃 설정

1. 생성된 `fairstay-ai` 함수 클릭
2. **구성** 탭 → **일반 구성** → **편집** 클릭
3. 설정 변경:
   - 메모리: **3008 MB** (최대값)
   - 제한 시간: **5분 0초**
   - 임시 스토리지: 512 MB (기본값)
4. **저장** 클릭

#### Function URL 생성 (외부 접근용 엔드포인트)

1. **구성** 탭 → 좌측 메뉴 → **함수 URL** 클릭
2. **함수 URL 생성** 클릭
3. **설정**:
   - 인증 유형: **NONE** (Backend Lambda만 호출하므로)
   - CORS 구성: 기본값 유지
4. **저장** 클릭
5. **Function URL 복사**:
   - 예: `https://abc123def456.lambda-url.ap-northeast-2.on.aws`

✅ **완료**: AI Lambda Function URL을 메모하세요!

#### AI 서버 테스트

웹 브라우저에서 Function URL 열기:
```
https://abc123def456.lambda-url.ap-northeast-2.on.aws/
```

**기대 응답**:
```json
{"message":"FastAPI Crack Detection Server","version":"1.0.0"}
```

---

### 6단계: Backend Lambda 배포 (수동 ZIP 업로드)

이 단계는 **터미널에서** ZIP 파일을 만든 후 **AWS 콘솔**에서 업로드합니다.

#### ZIP 파일 생성

```bash
cd fairstay_mvp_backend

# Node.js 의존성 설치
npm install

# ZIP 파일 생성 스크립트 실행
./build-lambda-zip.sh
```

스크립트가 `fairstay-mvp-backend-lambda.zip` 파일을 생성합니다.

#### Lambda 함수 생성 (AWS 콘솔)

1. **AWS Console** → **Lambda** 검색
2. **함수 생성** 클릭
3. **함수 설정**:
   - 옵션: **새로 작성**
   - 함수 이름: `fairstay-mvp-backend`
   - 런타임: **Node.js 18.x**
   - 아키텍처: **x86_64**
   - 실행 역할: **기본 실행 역할 생성** 선택
4. **함수 생성** 클릭

#### ZIP 파일 업로드

1. 생성된 `fairstay-mvp-backend` 함수 클릭
2. **코드 소스** 섹션 → **업로드** 버튼 클릭
3. **.zip 파일** 선택
4. `fairstay-mvp-backend-lambda.zip` 파일 선택
5. **저장** 클릭 (업로드 완료까지 1-2분 소요)

#### 환경 변수 설정

1. **구성** 탭 → **환경 변수** → **편집** 클릭
2. 다음 변수들 추가:

```
NODE_ENV=production
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=fairstay-mvp-s3
DYNAMODB_TABLE_PREFIX=fairstay-mvp-dynamo
AI_SERVER_URL=https://abc123def456.lambda-url.ap-northeast-2.on.aws
```

3. **저장** 클릭

#### IAM 권한 추가

1. **구성** 탭 → **권한** → 실행 역할 클릭 (새 탭에서 IAM 열림)
2. **권한 추가** → **정책 연결** 클릭
3. 다음 정책들 검색 후 추가:
   - `AmazonS3FullAccess` (S3 접근용)
   - `AmazonDynamoDBFullAccess` (DynamoDB 접근용)
4. **권한 추가** 클릭

#### Lambda 설정 조정

1. **구성** 탭 → **일반 구성** → **편집**
2. 설정 변경:
   - 메모리: **512 MB**
   - 제한 시간: **30초**
3. **저장** 클릭

#### Function URL 생성 (API 엔드포인트)

1. **구성** 탭 → **함수 URL** → **함수 URL 생성**
2. **설정**:
   - 인증 유형: **NONE**
   - CORS 구성:
     - Allow origin: `*`
     - Allow methods: `*`
     - Allow headers: `*`
3. **저장** 클릭
4. **Function URL 복사**:
   - 예: `https://xyz789abc.lambda-url.ap-northeast-2.on.aws`

✅ **완료**: Backend Lambda Function URL을 메모하세요!

#### Backend API 테스트

웹 브라우저에서 Function URL 열기:
```
https://xyz789abc.lambda-url.ap-northeast-2.on.aws/
```

**기대 응답**:
```json
{"message":"FairStay Backend API","version":"1.0.0"}
```

---

### 7단계: Frontend API URL 설정

#### src/config/api.ts 파일 수정

```bash
cd fairstay_mvp_frontend

# API 설정 파일 열기
nano src/config/api.ts
```

**PROD_API_URL 수정** (6단계에서 복사한 Backend Lambda Function URL):

```typescript
const PROD_API_URL = 'https://xyz789abc.lambda-url.ap-northeast-2.on.aws';
```

**저장**: `Ctrl+O` → `Enter` → `Ctrl+X`

✅ **완료**: Frontend가 Production Backend를 호출하도록 설정 완료

---

### 8단계: Android Release 키 생성

#### 키스토어 파일 생성

```bash
cd fairstay_mvp_frontend/android/app

# 키스토어 생성 (대화형 프롬프트)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore fairstay-release-key.keystore \
  -alias fairstay-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

**입력 정보** (프롬프트에 따라 차례로 입력):

1. **키스토어 비밀번호 입력**: `your-strong-password` (예: `FairStay2023!@#`)
2. **새 비밀번호 확인**: `your-strong-password` (위와 동일)
3. **이름과 성을 입력하십시오**: `FairStay`
4. **조직 단위 이름을 입력하십시오**: `Development`
5. **조직 이름을 입력하십시오**: `FairStay Inc`
6. **구/군/시 이름을 입력하십시오**: `Seoul`
7. **시/도 이름을 입력하십시오**: `Seoul`
8. **이 단위에 대한 두 자리 국가 코드를 입력하십시오**: `KR`
9. **올바릅니까?**: `예` 입력
10. **키 비밀번호 입력**: `Enter` (키스토어 비밀번호와 동일하게 사용)

**⚠️ 매우 중요 - 반드시 백업!**
- 생성된 파일: `fairstay-release-key.keystore`
- 비밀번호 메모: `your-strong-password`
- **이 파일과 비밀번호를 분실하면 앱 업데이트 불가능!**
- **안전한 장소에 백업** (USB, 클라우드 등)
- **Git에 절대 커밋하지 말 것** (`.gitignore`에 이미 포함됨)

#### gradle.properties 설정

```bash
cd fairstay_mvp_frontend/android

# gradle.properties 파일 열기
nano gradle.properties
```

**파일 끝에 추가** (비밀번호를 위에서 입력한 것으로 변경):

```properties
FAIRSTAY_UPLOAD_STORE_FILE=fairstay-release-key.keystore
FAIRSTAY_UPLOAD_KEY_ALIAS=fairstay-key-alias
FAIRSTAY_UPLOAD_STORE_PASSWORD=your-strong-password
FAIRSTAY_UPLOAD_KEY_PASSWORD=your-strong-password
```

**저장**: `Ctrl+O` → `Enter` → `Ctrl+X`

✅ **완료**: Android Release 서명 설정 완료

---

### 9단계: Release APK 빌드

#### APK 빌드 실행

```bash
cd fairstay_mvp_frontend/android

# 이전 빌드 파일 정리
./gradlew clean

# Release APK 빌드 (5-10분 소요)
./gradlew assembleRelease
```

**빌드 성공 메시지**:
```
BUILD SUCCESSFUL in 3m 45s
150 actionable tasks: 150 executed
```

#### APK 파일 확인

```bash
# APK 파일 위치 확인
ls -lh app/build/outputs/apk/release/

# 출력 예시:
# -rw-r--r--  1 susie  staff    42M Nov 22 12:34 app-release.apk
```

#### APK 복사 (편의성)

```bash
# Desktop으로 복사
cp app/build/outputs/apk/release/app-release.apk \
   ~/Desktop/FairStay-v1.0.0.apk

echo "✅ APK 생성 완료: ~/Desktop/FairStay-v1.0.0.apk"
```

✅ **완료**: Release APK 파일 생성 완료!

---

## 📱 APK 테스트

### Android 디바이스에 설치

#### USB 연결 방식

1. **Android 디바이스** USB로 Mac에 연결
2. **USB 디버깅 활성화**:
   - 설정 → 휴대전화 정보 → 빌드 번호 7번 터치 (개발자 모드 활성화)
   - 설정 → 개발자 옵션 → USB 디버깅 ON
3. **터미널에서 설치**:

```bash
# 디바이스 연결 확인
adb devices

# APK 설치
adb install ~/Desktop/FairStay-v1.0.0.apk
```

#### 파일 전송 방식 (USB 디버깅 없이)

1. **APK 파일 전송**:
   - USB로 연결 → 파일 전송 모드
   - `FairStay-v1.0.0.apk`를 Download 폴더로 복사
2. **디바이스에서 설치**:
   - 파일 관리자 앱 → Download 폴더
   - `FairStay-v1.0.0.apk` 터치
   - "출처를 알 수 없는 앱 설치 허용" → 허용
   - 설치 진행

### 기능 테스트 체크리스트

앱 실행 후 다음 기능들을 테스트하세요:

- [ ] 앱이 정상적으로 실행됨
- [ ] 세션 생성 화면이 표시됨
- [ ] "임차인" 또는 "임대인" 선택 가능
- [ ] 카메라 권한 요청 및 허용
- [ ] 카메라로 사진 촬영 가능
- [ ] 갤러리에서 기존 이미지 선택 가능
- [ ] 이미지 업로드 진행률 표시
- [ ] AI 분석 진행 중 로딩 표시
- [ ] 결과 화면에 원본/처리 이미지 표시
- [ ] 크랙 탐지 정보 표시 (개수, 위치 등)
- [ ] 네트워크 오류 시 에러 메시지 표시

---

## 🔧 문제 해결

### 1. Docker 이미지 푸시 실패

**증상**: `denied: Your authorization token has expired`

**해결**:
```bash
# ECR 재로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com
```

### 2. AI Lambda 호출 실패

**증상**: Backend에서 AI Lambda 연결 안됨

**확인 사항**:
1. **AWS Console** → **Lambda** → `fairstay-ai` 함수 클릭
2. **모니터링** 탭 → **CloudWatch 로그 보기**
3. 최근 로그에서 에러 확인

**Function URL 재확인**:
1. **구성** 탭 → **함수 URL**
2. URL이 `fairstay_mvp_backend/.env`의 `AI_SERVER_URL`과 일치하는지 확인

### 3. Backend 배포 실패

**증상**: `serverless deploy` 실패

**해결**:
```bash
# AWS 자격 증명 확인
aws sts get-caller-identity

# Serverless 캐시 정리
rm -rf .serverless
npm run deploy:prod
```

### 4. APK 빌드 실패

**증상**: `Execution failed for task ':app:packageRelease'`

**해결**:
```bash
cd fairstay_mvp_frontend/android

# 캐시 완전 정리
./gradlew clean
rm -rf app/build

# Gradle daemon 재시작
./gradlew --stop
./gradlew assembleRelease
```

### 5. APK에서 서버 연결 안됨

**증상**: 앱에서 이미지 업로드 실패

**확인 사항**:
1. `src/config/api.ts`의 `PROD_API_URL` 확인
2. 브라우저에서 API URL 접속 테스트
3. 디바이스가 인터넷에 연결되어 있는지 확인
4. **AWS Console** → **CloudWatch** → 로그 그룹:
   - `/aws/lambda/fairstay-backend-prod-api`
   - `/aws/lambda/fairstay-ai`

### 6. CloudWatch 로그 확인 방법

1. **AWS Console** → **CloudWatch** 검색
2. 좌측 메뉴 → **로그** → **로그 그룹**
3. 로그 그룹 선택:
   - `/aws/lambda/fairstay-backend-prod-api` (Backend)
   - `/aws/lambda/fairstay-ai` (AI Server)
4. 최신 로그 스트림 클릭
5. 에러 메시지 확인

---

## 💰 배포 비용 예상 (월 기준)

### AWS 리소스별 비용

- **S3**: $1-3 (이미지 저장, 1GB 기준)
- **DynamoDB**: $1-2 (온디맨드, 100만 요청 기준)
- **Backend Lambda**: $0-3 (100만 요청/월 무료 티어)
- **AI Lambda**: $8-20 (메모리 3GB, 5분 타임아웃, 컨테이너)
- **ECR**: $0.5-1 (이미지 저장 0.5GB)
- **API Gateway**: $1-3 (100만 API 호출)
- **CloudWatch Logs**: $0.5-1 (로그 저장)
- **데이터 전송**: $1-3 (아웃바운드)

**총 예상 비용: $13-36/월**

### 무료 티어 활용 (첫 12개월)

- Lambda: 월 100만 요청 무료
- S3: 5GB 저장 무료
- DynamoDB: 25GB 저장 무료
- API Gateway: 월 100만 API 호출 무료

**무료 티어 적용 시: $5-15/월**

### 비용 절감 팁

1. **S3 수명 주기 정책**: 30일 이상 된 이미지 삭제
2. **DynamoDB TTL**: 오래된 세션 자동 삭제
3. **CloudWatch 로그 보존**: 7일로 설정
4. **Lambda 메모리 최적화**: 필요 최소로 설정

---

## 🎉 배포 완료!

모든 단계를 완료했다면:

✅ **AWS 인프라 구축 완료**
- S3 버킷 생성 및 CORS 설정
- DynamoDB 테이블 3개 생성
- ECR 리포지토리 생성

✅ **AI 서버 배포 완료**
- Lambda Container Image 빌드 및 푸시
- AI Lambda 함수 생성 (3GB 메모리, 5분 타임아웃)
- Function URL 생성 및 테스트

✅ **Backend API 배포 완료**
- Serverless Framework 배포
- API Gateway 엔드포인트 생성
- S3/DynamoDB 연동

✅ **Frontend 설정 완료**
- Production API URL 설정
- Android Release 서명 키 생성

✅ **Release APK 생성 완료**
- 서명된 APK 파일 생성
- 디바이스 설치 및 테스트

---

## 📱 Google Play Store 배포 (선택사항)

### AAB 파일 생성 (Play Store 업로드용)

```bash
cd fairstay_mvp_frontend/android

# AAB(Android App Bundle) 빌드
./gradlew bundleRelease

# AAB 파일 위치
ls -lh app/build/outputs/bundle/release/app-release.aab
```

### Google Play Console 업로드 절차

1. **Google Play Console 접속**: https://play.google.com/console
2. **앱 만들기** 클릭:
   - 앱 이름: `FairStay`
   - 기본 언어: `한국어`
   - 앱 유형: `앱`
   - 무료/유료: `무료`
3. **프로덕션** → **새 버전 만들기**
4. **app-release.aab 업로드**
5. **버전 이름**: `1.0.0`
6. **출시 노트** 작성
7. **스토어 등록정보** 입력:
   - 앱 이름, 설명, 스크린샷, 아이콘
8. **콘텐츠 등급** 설정
9. **검토 제출**

**심사 기간**: 3-7일

---

## 🔄 앱/서버 업데이트

### Backend 코드 업데이트

```bash
cd fairstay_mvp_backend

# 코드 수정 후
npm run deploy:prod
```

### AI Lambda 업데이트

```bash
cd fairstay_mvp_ai

# Dockerfile 또는 모델 수정 후
./deploy-lambda.sh
```

### Frontend 업데이트 (APK 재빌드)

1. **버전 번호 증가**:

```bash
nano android/app/build.gradle
```

```gradle
defaultConfig {
    versionCode 2        // 1씩 증가
    versionName "1.0.1"  // 버전 이름 변경
}
```

2. **APK 재빌드**:

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

3. **새 APK 배포**:
   - 사용자에게 새 APK 전달
   - 또는 Google Play Store에 업데이트 제출

---

## 🧹 리소스 정리 (배포 취소)

테스트 완료 후 AWS 비용 절감을 위해 리소스를 삭제하려면:

### 1. Lambda 함수 삭제 (AWS 콘솔)

**AWS Console** → **Lambda**:
- `fairstay-ai` 삭제
- `fairstay-backend-prod-api` 삭제

### 2. Backend 스택 삭제 (터미널)

```bash
cd fairstay_mvp_backend
serverless remove --stage prod
```

### 3. S3 버킷 삭제 (AWS 콘솔)

**AWS Console** → **S3**:
- `fairstay-images-prod-XXX` 버킷 선택
- 버킷 비우기 → 삭제

### 4. DynamoDB 테이블 삭제 (AWS 콘솔)

**AWS Console** → **DynamoDB** → **테이블**:
- `fairstay_mvp_sessions` 삭제
- `fairstay_mvp_images` 삭제
- `fairstay_mvp_survey_responses` 삭제

### 5. ECR 리포지토리 삭제 (AWS 콘솔)

**AWS Console** → **ECR**:
- `fairstay-ai` 리포지토리 삭제

### 6. IAM 역할 삭제 (AWS 콘솔)

**AWS Console** → **IAM** → **역할**:
- `lambda-ai-execution-role` 삭제
- `fairstay-backend-prod-XXX-lambdaRole` 삭제 (Serverless가 생성)

---

## 📞 지원 및 문제 해결

### 배포 중 문제 발생 시

1. **CloudWatch 로그 확인** (위 "문제 해결" 섹션 참조)
2. **AWS 서비스 상태 확인**: https://status.aws.amazon.com
3. **Docker 로그 확인**: `docker logs <container_id>`
4. **Android Logcat 확인**: Android Studio → Logcat

### 추가 도움말

- **AWS Lambda 문서**: https://docs.aws.amazon.com/lambda
- **Serverless Framework 문서**: https://www.serverless.com/framework/docs
- **React Native 문서**: https://reactnative.dev/docs

---

**배포 완료를 축하합니다! 🎊**

이제 FairStay MVP가 완전히 배포되었으며, 사용자들에게 APK를 배포할 수 있습니다.
