# ToadsAI Agent 배포 가이드

## 로컬 개발 환경 설정

### 1. 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn
- Google Cloud Platform 계정
- Git

### 2. 프로젝트 설정

```bash
# 저장소 클론
git clone <repository-url>
cd toads-ai-agent

# 자동 설정 스크립트 실행
./setup.sh

# 또는 수동 설정
npm run install:all
```

### 3. Google Cloud 설정

#### 3.1 서비스 계정 생성
1. Google Cloud Console에서 프로젝트 생성
2. IAM & Admin > Service Accounts에서 서비스 계정 생성
3. 다음 권한 부여:
   - Cloud Storage Admin
   - Discovery Engine Admin
   - Vertex AI User
4. JSON 키 파일 다운로드

#### 3.2 Discovery Engine 설정
1. Discovery Engine API 활성화
2. 데이터 스토어 생성 (각 고객사별로)

#### 3.3 환경 변수 설정
`server/.env` 파일을 편집:

```env
# Google Cloud 설정
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=asia-northeast3

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# 서버 설정
PORT=5000
NODE_ENV=development

# CORS 설정
CLIENT_URL=http://localhost:3000
```

### 4. 개발 서버 실행

```bash
# 전체 서비스 실행 (백엔드 + 프론트엔드)
npm run dev

# 백엔드만 실행
npm run server:dev

# 프론트엔드만 실행
npm run client:dev
```

## Docker 배포

### 1. Docker Compose 사용

```bash
# 개발 환경
docker-compose up -d

# 프로덕션 환경
docker-compose -f docker-compose.prod.yml up -d
```

### 2. 개별 컨테이너 빌드

```bash
# 백엔드 빌드
cd server
docker build -t toads-ai-server .

# 프론트엔드 빌드
cd client
docker build -t toads-ai-client .
```

## 클라우드 배포

### 1. Google Cloud Run

#### 백엔드 배포
```bash
# Docker 이미지 빌드 및 푸시
gcloud builds submit --tag gcr.io/PROJECT_ID/toads-ai-server ./server

# Cloud Run에 배포
gcloud run deploy toads-ai-server \
  --image gcr.io/PROJECT_ID/toads-ai-server \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated
```

#### 프론트엔드 배포
```bash
# 빌드
cd client
npm run build

# Firebase Hosting 또는 Cloud Storage에 배포
firebase deploy
```

### 2. Kubernetes 배포

```bash
# 네임스페이스 생성
kubectl create namespace toads-ai

# 시크릿 생성
kubectl create secret generic google-cloud-key \
  --from-file=key.json=path/to/service-account-key.json \
  -n toads-ai

# 배포
kubectl apply -f k8s/ -n toads-ai
```

## 환경별 설정

### Development
- 로컬 데이터베이스 사용
- 디버그 로깅 활성화
- CORS 모든 도메인 허용

### Staging
- Google Cloud 서비스 사용
- 제한된 CORS 설정
- 로깅 레벨 조정

### Production
- Google Cloud 서비스 사용
- 엄격한 CORS 설정
- 보안 헤더 적용
- Rate limiting 활성화
- SSL/TLS 인증서 적용

## 모니터링 및 로깅

### 1. Google Cloud Monitoring
- Cloud Logging 설정
- Cloud Monitoring 대시보드 구성
- 알림 정책 설정

### 2. 애플리케이션 로깅
```javascript
// Winston 로거 설정 예시
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});
```

## 보안 고려사항

### 1. 인증 및 권한
- JWT 토큰 만료 시간 설정
- 사용자 권한 기반 접근 제어
- API Rate Limiting

### 2. 데이터 보안
- 고객사별 데이터 격리
- 파일 업로드 검증
- 민감한 정보 암호화

### 3. 네트워크 보안
- HTTPS 강제 사용
- CORS 정책 설정
- 보안 헤더 적용

## 백업 및 복구

### 1. 데이터 백업
```bash
# Google Cloud Storage 백업
gsutil -m cp -r gs://source-bucket gs://backup-bucket

# 데이터베이스 백업 (필요시)
gcloud sql export sql instance-name gs://backup-bucket/backup.sql
```

### 2. 재해 복구 계획
- 정기적인 백업 스케줄
- 복구 절차 문서화
- 테스트 환경에서 복구 테스트

## 성능 최적화

### 1. 프론트엔드
- 코드 스플리팅
- 이미지 최적화
- CDN 사용

### 2. 백엔드
- 캐싱 전략
- 데이터베이스 인덱싱
- API 응답 최적화

### 3. 인프라
- 로드 밸런싱
- 오토 스케일링
- CDN 구성
