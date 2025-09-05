# Vercel 배포 가이드

## 프로젝트 구조 변경 완료

Railway에서 Vercel로 배포 서버를 변경하기 위해 다음과 같은 작업을 완료했습니다:

### 1. Vercel 설정 파일 생성
- `vercel.json`: Vercel 빌드 및 라우팅 설정
- `vercel.env.example`: 환경 변수 예시 파일

### 2. API Routes 변환
서버의 Express 라우트를 Vercel API Routes로 변환:
- `api/auth/login.js`: 로그인 API
- `api/auth/register.js`: 회원가입 API
- `api/documents/index.js`: 문서 목록 API
- `api/chat/index.js`: 채팅 API

### 3. 빌드 설정 수정
- `package.json`의 빌드 스크립트를 Vercel에 맞게 수정
- 프론트엔드 빌드만 수행하도록 변경

## Vercel 배포 방법

### 1. Vercel CLI를 사용한 배포
```bash
# Vercel CLI 설치 (이미 완료됨)
npm install -g vercel

# Vercel에 로그인
vercel login

# 프로젝트 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 2. Vercel 웹 대시보드를 사용한 배포
1. [Vercel 대시보드](https://vercel.com/dashboard)에 접속
2. "New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 설정:
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 3. 환경 변수 설정
Vercel 대시보드의 Settings > Environment Variables에서 다음 변수들을 설정:

```
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLOUD_PROJECT_ID=shippingaiagent-470610
GOOGLE_CLOUD_REGION=asia-northeast3
VERTEX_AI_DATA_STORE_ID=toads-s-ai-store_1756888425304
GOOGLE_APPLICATION_CREDENTIALS=your_service_account_key_json
NODE_ENV=production
```

## 주요 변경사항

### API 엔드포인트 변경
- **이전 (Railway)**: `https://your-app.railway.app/api/auth/login`
- **이후 (Vercel)**: `https://your-app.vercel.app/api/auth/login`

### 프론트엔드 API 호출 수정 필요
`client/src/services/api.ts`에서 API 베이스 URL을 Vercel 도메인으로 변경해야 합니다.

### 데이터베이스 연결
기존 PostgreSQL 데이터베이스 연결 설정을 Vercel 환경에 맞게 조정해야 합니다.

## 다음 단계

1. **Vercel 배포 실행**
2. **환경 변수 설정**
3. **프론트엔드 API URL 수정**
4. **데이터베이스 연결 테스트**
5. **전체 기능 테스트**

## 문제 해결

### 빌드 오류 시
- Node.js 버전 확인 (Vercel은 18.x 권장)
- 의존성 설치 확인
- TypeScript 컴파일 오류 확인

### API 오류 시
- 환경 변수 설정 확인
- CORS 설정 확인
- 데이터베이스 연결 확인

---
**변경 완료 일시**: 2025년 9월 5일
**변경자**: Cursor AI Assistant
