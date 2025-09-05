# Railway 환경 변수 설정 가이드

## 502 오류 해결을 위한 필수 환경 변수

Railway 대시보드의 **Variables** 탭에서 다음 환경 변수들을 **반드시** 설정하세요:

### 1. 데이터베이스 연결 (필수)
```
DATABASE_URL=postgresql://${{Postgres-YilL.PGUSER}}:${{Postgres-YilL.PGPASSWORD}}@${{Postgres-YilL.PGHOST}}:${{Postgres-YilL.PGPORT}}/${{Postgres-YilL.PGDATABASE}}
```
**주의**: Railway PostgreSQL 서비스의 환경 변수를 참조하는 방식입니다. `Postgres-YilL`은 실제 서비스 이름에 맞게 변경하세요.

### 2. Google Cloud 인증 (필수)
```
GOOGLE_APPLICATION_CREDENTIALS=/app/server/shippingaiagent-470610-b4b13d7f087d.json
```
**중요**: 
- 서비스 계정 JSON 키 파일의 **절대 경로**를 설정하세요
- 파일은 `/app/server/` 디렉토리에 위치해야 합니다
- 파일명은 실제 서비스 계정 키 파일명과 일치해야 합니다

### 3. Google Cloud 프로젝트 설정 (필수)
```
GOOGLE_CLOUD_PROJECT_ID=shippingaiagent-470610
GOOGLE_CLOUD_REGION=asia-northeast3
VERTEX_AI_DATA_STORE_ID=toads-s-ai-store_1756888425304
```

### 4. 서버 설정 (필수)
```
NODE_ENV=production
```
**중요**: PORT 환경 변수는 Railway가 자동으로 설정합니다. 수동으로 설정하지 마세요!

### 5. JWT 설정 (필수)
```
JWT_SECRET=toads-ai-agent-production-super-secret-jwt-key-2024
JWT_EXPIRES_IN=7d
```

### 6. CORS 설정 (필수)
```
CLIENT_URL=https://toadss-ai-production.up.railway.app
```

### 7. Rate Limiting (선택사항)
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 502 오류 해결 단계

### 1단계: Railway PostgreSQL 서비스 추가
1. Railway 대시보드에서 프로젝트 선택
2. **+ New** 버튼 클릭
3. **Database** → **PostgreSQL** 선택
4. 서비스 이름을 `postgres`로 설정
5. **Deploy** 클릭

### 2단계: 환경 변수 설정
1. Railway 대시보드에서 프로젝트 선택
2. **Variables** 탭 클릭
3. 위의 각 환경 변수를 **Name**과 **Value**로 추가
4. **Save** 클릭

### 3단계: Google Cloud 서비스 계정 키 파일 배포
1. Google Cloud Console에서 서비스 계정 생성 (이미 완료됨)
2. 다음 권한 부여:
   - Storage Admin
   - AI Platform Developer
   - Discovery Engine Admin
3. JSON 키 파일이 이미 프로젝트에 포함되어 있음:
   - `server/shippingaiagent-470610-b4b13d7f087d.json`
   - `shippingaiagent-470610-b4b13d7f087d.json`
4. Railway 배포 시 자동으로 파일이 포함됨

### 4단계: 재배포
1. 모든 환경 변수 설정 완료 후
2. **Deployments** 탭에서 **Redeploy** 클릭
3. 또는 자동 재배포 대기

## Google Cloud 인증 오류 해결

### 파일 경로 설정 오류 해결
만약 다음과 같은 오류가 발생한다면:
```
Error: The file at /app/server/shippingaiagent-470610-b4b13d7f087d.json does not exist
```

이는 `GOOGLE_APPLICATION_CREDENTIALS` 환경 변수에 설정된 파일 경로에 서비스 계정 키 파일이 존재하지 않아서 발생하는 문제입니다.

**해결 방법:**
1. 서비스 계정 키 파일이 `/app/server/` 디렉토리에 있는지 확인
2. 파일명이 환경 변수와 정확히 일치하는지 확인
3. 파일 권한이 올바른지 확인

### 환경 변수 설정 확인
Railway 로그에서 다음 메시지를 확인하세요:
- `🔑 Using credentials from GOOGLE_APPLICATION_CREDENTIALS file` - 파일 기반 인증 성공
- `☁️ Google Cloud Storage client initialized` - Storage 클라이언트 초기화 성공
- `🤖 Google Cloud AI Platform client initialized` - AI Platform 클라이언트 초기화 성공

## 환경 변수 확인 방법

Railway 로그에서 다음 메시지들을 확인하세요:

✅ **성공 메시지:**
- `✅ PostgreSQL database connected`
- `✅ Database initialized successfully`
- `🚀 ToadsAI Agent Server running on port 5000`
- `☁️ Google Cloud Storage client initialized`

❌ **오류 메시지:**
- `❌ GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 찾을 수 없습니다`
- `❌ PostgreSQL database error`
- `❌ Failed to start server`

## 주의사항

- `GOOGLE_APPLICATION_CREDENTIALS`는 서비스 계정 키 파일의 **절대 경로**로 설정하세요
- 서비스 계정 키 파일은 이미 프로젝트에 포함되어 있어 별도 업로드가 불필요합니다
- `CLIENT_URL`은 실제 Railway 앱 URL로 변경하세요
- `DATABASE_URL`은 Railway PostgreSQL 서비스에서 자동으로 생성됩니다
- 모든 환경 변수 설정 후 재배포가 필요합니다
- 환경 변수 설정 후 서버 로그를 확인하여 오류가 없는지 검증하세요
- 서비스 계정 키 파일은 보안상 중요하므로 공개 저장소에 업로드하지 마세요