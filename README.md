# ToadsAI Agent - 멀티테넌트 AI 에이전트 서비스

해운 선사를 위한 문서 기반 AI 질의응답 서비스입니다.

## 주요 기능

- **멀티테넌트 아키텍처**: 고객사별 데이터 완전 격리
- **문서 관리**: PDF, DOCX, HWP, JPG, DWG 등 다양한 형식 지원
- **AI 질의응답**: Gemini 1.5 Pro 기반 정확한 답변 제공
- **출처 추적**: 모든 답변에 근거 문서 출처 표시

## 기술 스택

### 백엔드
- Node.js + Express.js
- Google Cloud Platform (Vertex AI Search, Cloud Storage)
- JWT 인증
- Multer (파일 업로드)

### 프론트엔드
- React 18
- TypeScript
- Tailwind CSS
- Axios

## 설치 및 실행

### 1. 전체 의존성 설치
```bash
npm run install:all
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Google Cloud 설정
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=asia-northeast3

# JWT 설정
JWT_SECRET=your-jwt-secret

# 서버 설정
PORT=5000
NODE_ENV=development
```

### 3. 개발 서버 실행
```bash
npm run dev
```

이 명령어는 백엔드 서버(포트 5000)와 프론트엔드 개발 서버(포트 3000)를 동시에 실행합니다.

## API 엔드포인트

### 인증
- `POST /api/auth/login` - 사용자 로그인
- `POST /api/auth/register` - 사용자 등록

### 채팅
- `POST /api/chat` - AI 질의응답

### 문서 관리
- `GET /api/documents` - 문서 목록 조회
- `POST /api/documents` - 문서 업로드
- `DELETE /api/documents/:id` - 문서 삭제

## 프로젝트 구조

```
toads-ai-agent/
├── server/                 # 백엔드 서버
│   ├── src/
│   │   ├── controllers/    # API 컨트롤러
│   │   ├── middleware/     # 미들웨어
│   │   ├── models/         # 데이터 모델
│   │   ├── routes/         # API 라우트
│   │   ├── services/       # 비즈니스 로직
│   │   └── utils/          # 유틸리티 함수
│   ├── package.json
│   └── index.js
├── client/                 # 프론트엔드 앱
│   ├── src/
│   │   ├── components/     # React 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── services/       # API 서비스
│   │   ├── hooks/          # 커스텀 훅
│   │   └── utils/          # 유틸리티
│   ├── public/
│   ├── package.json
│   └── src/index.tsx
├── package.json
└── README.md
```

## 보안 고려사항

- 고객사별 Google Cloud 프로젝트 격리
- JWT 기반 인증
- 파일 업로드 검증
- CORS 설정

## 라이선스

MIT License
# Railway 빌드 캐시 초기화
