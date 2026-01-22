# 백엔드 빌드
npm run build

# 백엔드 배포용 zip 파일 (lambda)
cd fairstay_mvp_backend
./build-lambda-zip.sh

# IAM 사용자 정리
1. ai lambda에 연결된 role: fairstay-mvp-ai-role
2. backend lambda에 연결된 role: fairstay-mvp-backend-role
3. ai cicd: fairstay-ai-cicd-user; ECR, Lambda 업로드
4. bakcend cicd: fairstay-backend-cicd-user; Lambda 업로드
