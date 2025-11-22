#!/bin/bash

# Backend Lambda 수동 배포용 ZIP 파일 생성 스크립트

echo "🚀 Backend Lambda ZIP 파일 생성 시작..."

# 1. TypeScript 컴파일
echo "📦 Step 1: TypeScript 컴파일 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ TypeScript 컴파일 실패!"
    exit 1
fi

# 2. 임시 디렉토리 생성
echo "📁 Step 2: 배포 패키지 준비 중..."
rm -rf lambda-package
mkdir -p lambda-package

# 3. 컴파일된 코드 복사
echo "📋 Step 3: 컴파일된 파일 복사 중..."
cp -r dist lambda-package/

# 4. package.json과 package-lock.json 복사
echo "📋 Step 4: package.json 복사 중..."
cp package.json lambda-package/
cp package-lock.json lambda-package/ 2>/dev/null || echo "package-lock.json 없음 (건너뜀)"

# 5. 프로덕션 의존성만 설치
echo "📦 Step 5: 프로덕션 의존성 설치 중..."
cd lambda-package
npm install --production --omit=dev

if [ $? -ne 0 ]; then
    echo "❌ 의존성 설치 실패!"
    exit 1
fi

# 6. ZIP 파일 생성
echo "🗜️  Step 6: ZIP 파일 생성 중..."
cd ..
rm -f fairstay-mvp-backend-lambda.zip

cd lambda-package
zip -r ../fairstay-mvp-backend-lambda.zip . -x "*.git*" -x "*.DS_Store"

if [ $? -ne 0 ]; then
    echo "❌ ZIP 파일 생성 실패!"
    exit 1
fi

cd ..

# 7. 정리
echo "🧹 Step 7: 임시 파일 정리 중..."
rm -rf lambda-package

# 8. ZIP 파일 정보 출력
ZIP_SIZE=$(du -h fairstay-mvp-backend-lambda.zip | cut -f1)
echo ""
echo "✅ ZIP 파일 생성 완료!"
echo "📦 파일: fairstay-mvp-backend-lambda.zip"
echo "📏 크기: $ZIP_SIZE"
echo ""
echo "🎯 다음 단계:"
echo "1. AWS Console → Lambda → 함수 생성"
echo "2. 함수 이름: fairstay-mvp-backend"
echo "3. 런타임: Node.js 18.x"
echo "4. 코드 소스 → 업로드 → .zip 파일 → fairstay-mvp-backend-lambda.zip 선택"
echo "5. 코드 소스 → 런타임 설정 → 편집 → 핸들러: dist/lambda.handler"
echo "6. 환경 변수 설정:"
echo "   - S3_BUCKET_NAME=fairstay-mvp-s3"
echo "   - DYNAMODB_TABLE_PREFIX=fairstay-mvp-dynamo"
echo "   - AI_SERVER_URL=(AI Lambda Function URL)"
echo ""
