# Vercel 환경 변수 올바른 설정 가이드

## 문제 요약
현재 오류: `error:1E08010C:DECODER routines::unsupported`
**근본 원인**: Vercel 환경 변수에 JSON을 복사할 때 `private_key`의 줄바꿈(`\n`)이 깨짐

## 해결 방법

### 1. 올바른 키 파일 내용 확인
로컬의 키 파일: `/Volumes/GH WORK/01.Dev_Service/50.ToadsAI/toadsaiagent-471301-06253419f316.json`

### 2. Vercel 환경 변수 설정
1. **Vercel 대시보드 접속** (vercel.com)
2. **프로젝트 선택** → Settings → Environment Variables
3. **다음 환경 변수들을 설정:**

#### 필수 환경 변수:
```
GOOGLE_APPLICATION_CREDENTIALS = [키 파일의 전체 JSON 내용]
GOOGLE_CLOUD_PROJECT_ID = toadsaiagent-471301
```

#### 키 파일 복사 시 주의사항:
- **반드시 전체 JSON을 한 번에 복사**
- 들여쓰기나 줄바꿈 수정하지 말것
- `private_key`의 `\n` 문자들이 그대로 보존되어야 함

#### 올바른 형태 예시:
```json
{
  "type": "service_account",
  "project_id": "toadsaiagent-471301",
  "private_key_id": "06253419f3168788093240e17abf4ef4d9324ca2",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w...\n-----END PRIVATE KEY-----\n",
  "client_email": "toads-shipping-ai-server@toadsaiagent-471301.iam.gserviceaccount.com",
  ...
}
```

### 3. 배포 후 확인
1. Vercel에서 **Redeploy** 실행
2. 로그에서 다음 메시지 확인:
   ```
   🚀 DEPLOYMENT CHECKPOINT: Running constructor v14 - Final Auth Fix 🚀
   ✅ All Google Cloud clients initialized automatically.
   ```

### 4. 추가 필요한 Google Cloud 설정
```bash
# 서비스 계정에 Storage 권한 부여
gcloud projects add-iam-policy-binding toadsaiagent-471301 \
  --member="serviceAccount:toads-shipping-ai-server@toadsaiagent-471301.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# 버킷 생성 (없는 경우)
gsutil mb -p toadsaiagent-471301 -c STANDARD -l asia-northeast3 gs://toads-shipping-ai-docs
```

## 성공 지표
환경 변수 설정이 올바르면:
- ✅ 인증 오류 없이 로그인 성공  
- ✅ Google Cloud Storage 버킷 접근 가능
- ✅ 고객별 폴더 자동 생성