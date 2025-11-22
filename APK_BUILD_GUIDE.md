# APK 빌드 가이드

## 방법 1: 로컬 네트워크 테스트용 APK (권장 - 빠름)

### 전제조건
- 컴퓨터와 Android 디바이스가 같은 WiFi에 연결
- 컴퓨터에서 AI 서버와 Backend 실행 중

### 1단계: 컴퓨터 IP 주소 확인

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# 예시 출력: inet 192.168.0.10 ...
# → 192.168.0.10 이 컴퓨터 IP
```

### 2단계: Frontend API 설정 수정

`fairstay_mvp_frontend/src/config/api.ts` 파일 수정:

```typescript
// 개발 환경 - 실제 디바이스용
const DEV_API_URL = 'http://192.168.0.10:3000'; // 여기에 컴퓨터 IP 입력

// 프로덕션 환경 - 나중에 AWS 주소로 변경
const PROD_API_URL = 'http://192.168.0.10:3000'; // 임시로 같은 주소 사용

// __DEV__ 대신 항상 개발 서버 사용
export const API_URL = DEV_API_URL;
```

### 3단계: Debug APK 빌드 (서명 불필요)

```bash
cd /Users/susie/Desktop/Temp_Laptop3/Solidity_Files/Yn/fairstay/fairstay_mvp_frontend

# Android 폴더로 이동
cd android

# Debug APK 빌드
./gradlew assembleDebug

# 빌드된 APK 위치:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 4단계: APK 디바이스에 설치

```bash
# USB로 디바이스 연결 (USB 디버깅 활성화 필요)
adb install app/build/outputs/apk/debug/app-debug.apk

# 또는 파일을 직접 디바이스로 복사해서 설치
```

### 5단계: 테스트

1. 컴퓨터에서 AI 서버 실행:
   ```bash
   cd fairstay_mvp_ai
   python main.py
   ```

2. 컴퓨터에서 Backend 실행:
   ```bash
   cd fairstay_mvp_backend
   npm run dev
   ```

3. 디바이스에서 FairStay 앱 실행

4. 이미지 업로드 및 분석 테스트

---

## 방법 2: 릴리즈 APK (Google Play 배포용)

### 1단계: 서명 키 생성

```bash
cd /Users/susie/Desktop/Temp_Laptop3/Solidity_Files/Yn/fairstay/fairstay_mvp_frontend/android/app

# 키스토어 생성
keytool -genkeypair -v -storetype PKCS12 \
  -keystore fairstay-release-key.keystore \
  -alias fairstay-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000

# 입력 정보:
# - 비밀번호 (잘 기억해두기!)
# - 이름, 조직, 도시 등
```

### 2단계: gradle.properties 설정

`android/gradle.properties` 파일에 추가:

```properties
FAIRSTAY_UPLOAD_STORE_FILE=fairstay-release-key.keystore
FAIRSTAY_UPLOAD_KEY_ALIAS=fairstay-key-alias
FAIRSTAY_UPLOAD_STORE_PASSWORD=your-password-here
FAIRSTAY_UPLOAD_KEY_PASSWORD=your-password-here
```

### 3단계: app/build.gradle 수정

`android/app/build.gradle` 파일에서 signingConfigs 추가:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('FAIRSTAY_UPLOAD_STORE_FILE')) {
                storeFile file(FAIRSTAY_UPLOAD_STORE_FILE)
                storePassword FAIRSTAY_UPLOAD_STORE_PASSWORD
                keyAlias FAIRSTAY_UPLOAD_KEY_ALIAS
                keyPassword FAIRSTAY_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4단계: ProGuard 규칙 추가

`android/app/proguard-rules.pro` 파일 생성/수정:

```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Image Picker
-keep class com.imagepicker.** { *; }
```

### 5단계: 릴리즈 APK 빌드

```bash
cd /Users/susie/Desktop/Temp_Laptop3/Solidity_Files/Yn/fairstay/fairstay_mvp_frontend/android

# 캐시 정리
./gradlew clean

# 릴리즈 빌드
./gradlew assembleRelease

# 빌드된 APK 위치:
# android/app/build/outputs/apk/release/app-release.apk
```

### 6단계: APK 크기 최적화 (선택사항)

```bash
# AAB (Android App Bundle) 빌드 - Google Play 업로드용
./gradlew bundleRelease

# 빌드된 AAB 위치:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 방법 3: AWS 배포 후 프로덕션 APK

### 필요한 AWS 리소스

1. **AI 서버**: EC2 또는 Lambda Container
2. **Backend**: Lambda + API Gateway
3. **S3**: 이미지 저장용 버킷
4. **DynamoDB**: 데이터 저장용 테이블

### 배포 후 설정

`src/config/api.ts`:
```typescript
const PROD_API_URL = 'https://your-api-id.execute-api.ap-northeast-2.amazonaws.com/prod';
export const API_URL = PROD_API_URL;
```

그 후 릴리즈 APK 빌드

---

## 빠른 시작 (추천)

```bash
# 1. 컴퓨터 IP 확인
ifconfig | grep "inet "

# 2. src/config/api.ts 수정
# DEV_API_URL을 컴퓨터 IP로 변경

# 3. Debug APK 빌드
cd fairstay_mvp_frontend/android
./gradlew assembleDebug

# 4. APK 설치
adb install app/build/outputs/apk/debug/app-debug.apk

# 5. 서버 실행
# AI: python main.py
# Backend: npm run dev

# 6. 앱 테스트!
```

---

## 문제 해결

### Gradle 빌드 실패
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### ADB 디바이스 인식 안됨
```bash
adb devices
# USB 디버깅 활성화 확인
# 개발자 옵션 > USB 디버깅
```

### 앱에서 서버 연결 안됨
- 방화벽 확인 (포트 3000, 8000 열기)
- WiFi가 같은 네트워크인지 확인
- 컴퓨터 IP 주소가 맞는지 확인
