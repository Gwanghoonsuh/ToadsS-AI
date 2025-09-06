# Google Cloud Storage 설정 체크리스트

## 현재 문제
- 프로젝트 ID: `toadsaiagent-471301` (올바른 프로젝트)
- 서비스 계정: `ghsuh-toads-kr@shippingaiagent-470610.iam.gserviceaccount.com` (잘못된 프로젝트 계정!)
- 에러: `storage.buckets.get` 권한 없음
- 버킷: `toads-shipping-ai-docs`

## 필수 확인 사항

### 1. 버킷 존재 여부 확인
```bash
# Google Cloud Console에서 확인 (올바른 프로젝트)
https://console.cloud.google.com/storage/browser?project=toadsaiagent-471301

# 또는 CLI로 확인
gsutil ls gs://toads-shipping-ai-docs
```

### 2. 필요한 IAM 권한
서비스 계정에 다음 권한이 필요합니다:

**기본 권한 (Role):**
- `Storage Object Admin` (roles/storage.objectAdmin)
- 또는 개별 권한들:
  - `storage.buckets.get`
  - `storage.buckets.create` (버킷 생성 시)
  - `storage.objects.create`
  - `storage.objects.delete`
  - `storage.objects.get`
  - `storage.objects.list`

### 3. IAM 권한 부여 방법

**Google Cloud Console:**
1. IAM & Admin → IAM
2. 서비스 계정 찾기: `ghsuh-toads-kr@shippingaiagent-470610.iam.gserviceaccount.com`
3. Edit → Add Role → `Storage Object Admin`

**CLI 명령어 (올바른 프로젝트 ID로 수정 필요):**
```bash
# 프로젝트 레벨 권한 부여
gcloud projects add-iam-policy-binding toadsaiagent-471301 \
  --member="serviceAccount:NEW_SERVICE_ACCOUNT@toadsaiagent-471301.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# 특정 버킷에만 권한 부여 (권장)
gsutil iam ch serviceAccount:ghsuh-toads-kr@shippingaiagent-470610.iam.gserviceaccount.com:objectAdmin gs://toads-shipping-ai-docs
```

### 4. 버킷 생성 (없는 경우)
```bash
# 버킷 생성
gsutil mb -p shippingaiagent-470610 -c STANDARD -l asia-northeast3 gs://toads-shipping-ai-docs

# 생성 후 권한 부여
gsutil iam ch serviceAccount:ghsuh-toads-kr@shippingaiagent-470610.iam.gserviceaccount.com:objectAdmin gs://toads-shipping-ai-docs
```

## 확인 방법

### 권한 확인
```bash
# 서비스 계정 권한 확인
gcloud projects get-iam-policy shippingaiagent-470610 \
  --flatten="bindings[].members" \
  --filter="bindings.members:ghsuh-toads-kr@shippingaiagent-470610.iam.gserviceaccount.com"
```

### 버킷 접근 테스트
```bash
# 서비스 계정으로 인증 후 테스트
gcloud auth activate-service-account --key-file=path/to/service-account-key.json
gsutil ls gs://toads-shipping-ai-docs/
```