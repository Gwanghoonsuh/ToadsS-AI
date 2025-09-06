# 서비스 계정 키 교체 가이드

## 문제 요약
- 현재 사용 중: `ghsuh-toads-kr@shippingaiagent-470610.iam.gserviceaccount.com` (잘못됨)
- 올바른 계정: `toads-shipping-ai-server@toadsaiagent-471301.iam.gserviceaccount.com`
- 올바른 키 파일: `toadsaiagent-471301-06253419f316.json`

## 해결 방법

### 1. Vercel 배포 환경
1. Vercel 대시보드 접속 (vercel.com)
2. 프로젝트 선택 → Settings → Environment Variables
3. `GOOGLE_APPLICATION_CREDENTIALS` 또는 `GOOGLE_CLOUD_CREDENTIALS` 찾기
4. 값을 올바른 키 파일의 전체 JSON 내용으로 교체
5. Redeploy 필요

### 2. 로컬 환경
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Volumes/GH WORK/01.Dev_Service/50.ToadsAI/toadsaiagent-471301-06253419f316.json"
```

### 3. 올바른 서비스 계정에 권한 부여
```bash
# Storage Object Admin 권한 부여
gcloud projects add-iam-policy-binding toadsaiagent-471301 \
  --member="serviceAccount:toads-shipping-ai-server@toadsaiagent-471301.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### 4. 버킷 생성 (필요한 경우)
```bash
gsutil mb -p toadsaiagent-471301 -c STANDARD -l asia-northeast3 gs://toads-shipping-ai-docs
```

## 예상 결과
교체 후 로그인 시:
```
서비스 계정 이메일: toads-shipping-ai-server@toadsaiagent-471301.iam.gserviceaccount.com
✅ Customer folder created: 1/
```