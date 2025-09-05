# Railway 502 오류 디버깅 가이드

## 502 오류 원인 분석

502 Bad Gateway 오류는 Railway가 서버에 연결할 수 없을 때 발생합니다. 주요 원인들:

### 1. 서버 시작 실패
- 필수 환경 변수 누락
- 데이터베이스 연결 실패
- Google Cloud 인증 실패

### 2. 포트 설정 문제
- 서버가 Railway가 기대하는 포트에서 실행되지 않음
- Railway는 `PORT` 환경 변수를 사용
- 서버가 `0.0.0.0`에서 리스닝하지 않음

### 3. 서버 크래시
- 초기화 중 오류 발생
- 의존성 문제
- 데이터베이스 연결 타임아웃

### 4. Connection Refused 오류
- 서버가 완전히 시작되지 않음
- 포트 바인딩 실패
- 프로세스 크래시
- Railway PORT 환경 변수 미설정

## 디버깅 단계

### 1단계: Railway 로그 확인
1. Railway 대시보드 → 프로젝트 선택
2. **Deployments** 탭 → 최신 배포 클릭
3. **Logs** 탭에서 오류 메시지 확인

### 2단계: 환경 변수 확인
Railway 대시보드 → **Variables** 탭에서 다음 변수들이 설정되어 있는지 확인:

**필수 변수:**
- `DATABASE_URL=postgresql://${{Postgres-YilL.PGUSER}}:${{Postgres-YilL.PGPASSWORD}}@${{Postgres-YilL.PGHOST}}:${{Postgres-YilL.PGPORT}}/${{Postgres-YilL.PGDATABASE}}`
- `NODE_ENV=production`
- `JWT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_REGION`
- `VERTEX_AI_DATA_STORE_ID`
- `CLIENT_URL`

**중요**: `PORT` 환경 변수는 Railway가 자동으로 설정합니다. 수동으로 설정하지 마세요!

### 3단계: PostgreSQL 서비스 확인
1. Railway 대시보드에서 PostgreSQL 서비스가 있는지 확인
2. 없다면 **+ New** → **Database** → **PostgreSQL** 추가
3. 서비스 이름을 `Postgres-YilL`로 설정 (또는 원하는 이름)
4. **Variables** 탭에서 PostgreSQL 관련 환경 변수들이 생성되었는지 확인:
   - `Postgres-YilL.PGUSER`
   - `Postgres-YilL.PGPASSWORD`
   - `Postgres-YilL.PGHOST`
   - `Postgres-YilL.PGPORT`
   - `Postgres-YilL.PGDATABASE`

### 4단계: Google Cloud 설정 확인
1. Google Cloud Console에서 서비스 계정 생성
2. 필요한 권한 부여:
   - Storage Admin
   - AI Platform Developer
   - Discovery Engine Admin
3. JSON 키 파일 다운로드
4. JSON 내용을 한 줄로 압축하여 `GOOGLE_APPLICATION_CREDENTIALS`에 설정

## 로그에서 확인할 메시지

### ✅ 성공 메시지
```
✅ PostgreSQL database connected
✅ Database initialized successfully
🚀 ToadsAI Agent Server running on port 5000
☁️ Google Cloud Storage client initialized
```

### ❌ 오류 메시지
```
❌ Missing required environment variables: DATABASE_URL
❌ PostgreSQL database error
❌ Failed to start server
❌ GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 찾을 수 없습니다
```

## 문제 해결 방법

### 방법 1: 환경 변수 재설정
1. Railway 대시보드 → **Variables** 탭
2. 모든 필수 환경 변수 확인 및 재설정
3. **Save** 클릭
4. 자동 재배포 대기

### 방법 2: 수동 재배포
1. Railway 대시보드 → **Deployments** 탭
2. **Redeploy** 버튼 클릭
3. 재배포 완료 후 로그 확인

### 방법 3: 서비스 재시작
1. Railway 대시보드 → **Settings** 탭
2. **Restart** 버튼 클릭

### 방법 4: 포트 문제 해결
1. Railway 대시보드 → **Variables** 탭
2. `PORT` 환경 변수가 설정되어 있는지 확인
3. 없다면 `PORT=5000` 추가
4. **Save** 클릭 후 재배포

## 추가 확인사항

### 포트 설정
- Railway는 `PORT` 환경 변수를 사용
- 서버 코드에서 `process.env.PORT || 8080` 사용
- `PORT=5000`으로 설정 권장

### 데이터베이스 연결
- `DATABASE_URL`이 올바르게 설정되었는지 확인
- PostgreSQL 서비스가 실행 중인지 확인

### Google Cloud 설정
- 서비스 계정 JSON이 올바른 형식인지 확인
- 프로젝트 ID와 리전이 정확한지 확인
- 필요한 API가 활성화되어 있는지 확인

## 연락처

문제가 지속되면 다음 정보와 함께 문의하세요:
- Railway 로그 전체 내용
- 설정된 환경 변수 목록
- 오류 발생 시간
- 재현 단계
