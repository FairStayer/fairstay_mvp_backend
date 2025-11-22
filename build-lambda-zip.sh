#!/bin/bash

echo "🚀 Lambda ZIP 생성 시작..."

npm run build
if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

rm -rf lambda-package
mkdir lambda-package

cp dist/index.js lambda-package/
cp -r dist/* lambda-package/
cp package.json lambda-package/

cd lambda-package
npm install --production --silent
cd ..

rm -f fairstay-mvp-backend-lambda.zip
cd lambda-package && zip -rq ../fairstay-mvp-backend-lambda.zip . && cd ..

rm -rf lambda-package

echo "✅ 완료: fairstay-mvp-backend-lambda.zip"
ls -lh fairstay-mvp-backend-lambda.zip
