# ToadsAI Agent - 멀티테넌트 AI 에이전트 서비스

해운 선사를 위한 문서 기반 AI 질의응답 서비스입니다.

## 🚀 프로덕션 환경
- **사이트**: https://toads-s-ai.vercel.app/
- **플랫폼**: Vercel
- **프로젝트 ID**: toadsaiagent-471301

## 주요 기능

- **멀티테넌트 아키텍처**: 고객사별 데이터 완전 격리
- **문서 관리**: PDF, DOCX, HWP, JPG, DWG 등 다양한 형식 지원
- **AI 질의응답**: Gemini 1.5 Pro 기반 정확한 답변 제공
- **Google Cloud Storage**: 고객별 폴더 구조로 문서 저장
- **출처 추적**: 모든 답변에 근거 문서 출처 표시

## 기술 스택

### 백엔드 (API)
- Node.js + Express.js
- Google Cloud Platform (Vertex AI, Cloud Storage)
- JWT 인증
- Multer (파일 업로드)

### 프론트엔드 (Client)
- React 18 + TypeScript
- Tailwind CSS
- React Router Dom
- Axios

### 배포
- **Vercel**: Serverless 배포
- **Google Cloud Storage**: 파일 저장소
- **환경 분리**: 개발/프로덕션 완전 분리

## 로컬 개발 환경 설정

### 1. 의존성 설치
```bash
# 루트에서 전체 설치
npm install

# 개별 설치 (필요시)
cd api && npm install
cd client && npm install
```

### 2. 환경 변수 설정
루트 디렉토리에 `.env` 파일 생성:

```env
# Google Cloud 설정 (프로덕션)
GOOGLE_APPLICATION_CREDENTIALS=JSON_CREDENTIALS_STRING
GOOGLE_CLOUD_PROJECT_ID=toadsaiagent-471301
GOOGLE_CLOUD_REGION=asia-northeast3

# JWT 설정
JWT_SECRET=your-jwt-secret-here

# 서버 설정
PORT=5001
NODE_ENV=development
```

### 3. 개발 서버 실행
```bash
# 백엔드만 실행
cd api && npm start

# 프론트엔드만 실행  
cd client && npm start

# 또는 루트에서 전체 실행
npm run dev
```

## API 엔드포인트

### 인증
- `POST /api/auth/login` - 사용자 로그인 & 고객 폴더 초기화
- `POST /api/auth/register` - 사용자 등록 & 고객 폴더 생성

### 채팅
- `POST /api/chat` - AI 질의응답 (고객별 문서 검색)

### 문서 관리
- `GET /api/documents` - 고객별 문서 목록 조회
- `POST /api/documents` - 문서 업로드 (고객별 폴더)
- `DELETE /api/documents/:fileName` - 문서 삭제

## 프로젝트 구조

```
ToadsAI/
├── api/                    # 백엔드 API (Vercel Functions)
│   ├── src/
│   │   ├── controllers/    # API 컨트롤러
│   │   ├── middleware/     # 미들웨어 (JWT 인증)
│   │   ├── routes/         # API 라우트
│   │   ├── services/       # Google Cloud 서비스
│   │   └── prompts/        # AI 프롬프트 관리
│   ├── claudedocs/         # 배포 가이드 문서
│   ├── package.json
│   └── index.js            # Vercel 진입점
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/     # React 컴포넌트
│   │   ├── pages/          # 페이지 (Login, Dashboard, Chat)
│   │   ├── services/       # API 클라이언트
│   │   ├── hooks/          # 커스텀 훅
│   │   └── utils/          # 유틸리티 함수
│   ├── build/              # 빌드된 정적 파일
│   ├── public/
│   ├── package.json
│   └── src/index.tsx
├── vercel.json             # Vercel 배포 설정
├── package.json            # 루트 패키지 설정
└── README.md
```

## 배포 구조

### Vercel 배포 설정
- **API**: `/api/*` → `api/index.js` (Serverless Functions)
- **Client**: `/` → `client/build/*` (Static Files)
- **SPA Routing**: 모든 경로를 `client/$1`으로 처리

### Google Cloud Storage 구조
```
gs://toads-shipping-ai-docs/
├── customer-1/             # 고객사 1의 문서들
│   ├── 20231201-abc123-document1.pdf
│   └── 20231201-def456-document2.docx
├── customer-2/             # 고객사 2의 문서들
│   └── 20231201-ghi789-document3.pdf
└── ...
```

## 보안 특징

- **멀티테넌트 데이터 격리**: 고객사별 폴더 구조로 완전 분리
- **JWT 인증**: 토큰 기반 사용자 인증
- **Google Cloud IAM**: 서비스 계정 기반 인증
- **파일 업로드 검증**: MIME 타입 및 확장자 검증
- **CORS 설정**: 보안 헤더 적용

## Vercel 환경 변수

Vercel 대시보드에서 다음 변수들을 설정하세요:

```env
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
GOOGLE_CLOUD_PROJECT_ID=toadsaiagent-471301
JWT_SECRET=your-production-jwt-secret
```

## 개발자 가이드

### 로컬 테스트
```bash
# API 테스트
cd api && npm test

# 클라이언트 테스트  
cd client && npm test
```

### 빌드 및 배포
```bash
# 클라이언트 빌드
cd client && npm run build

# Vercel 배포
git push origin main  # 자동 배포
```

## 라이선스

MIT License
