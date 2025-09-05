# Railway 포트 문제 해결 방법

## 문제 상황
- 서버는 성공적으로 시작됨 (로그에서 확인)
- 하지만 502 "connection refused" 오류 발생
- Railway가 할당한 포트와 서버가 리스닝하는 포트가 다름

## 해결 방법

### 방법 1: Railway에서 PORT 환경 변수 삭제 (중요!)
1. Railway 대시보드 → **Variables** 탭
2. **PORT** 환경 변수가 있다면 **삭제**
3. Railway가 자동으로 PORT를 관리하도록 두기
4. **Save** 클릭
5. **Deployments** 탭에서 **Redeploy** 클릭

### 방법 2: 서버 코드 확인
서버 코드가 올바르게 설정되어 있는지 확인:
```javascript
// Railway 환경에서는 Railway가 지정한 포트(process.env.PORT)를 사용하고,
// 만약 없다면(로컬 개발 환경이면) 5000번 포트를 사용합니다.
const PORT = process.env.PORT || 5000;

// '0.0.0.0' 호스트는 컨테이너 환경에서 외부 연결을 허용하기 위해 필수입니다.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
```

### 방법 3: Railway.json 설정 확인
현재 `railway.json` 설정:
```json
{
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
        "builder": "NIXPACKS",
        "buildCommand": "npm run build"
    },
    "deploy": {
        "startCommand": "node start-railway.js",
        "restartPolicyType": "ON_FAILURE",
        "restartPolicyMaxRetries": 10
    }
}
```

## 디버깅 단계

### 1단계: Railway 로그에서 포트 정보 확인
재배포 후 로그에서 다음을 확인:
```
🔍 Port configuration details:
   - process.env.PORT: [Railway에서 자동 설정한 값]
   - Final PORT value: [실제 사용되는 포트]
   - PORT type: string
   - PORT parsed: [숫자로 변환된 포트]
```

### 2단계: 서버 시작 로그 확인
```
🌐 Starting server on 0.0.0.0:[포트]
🚀 ToadsAI Agent Server running on port [포트]
✅ Server is ready to accept connections on port [포트]
```

## 예상 결과
성공 시 로그:
```
✅ Railway assigned port: [Railway가 할당한 포트]
🌐 Starting server on 0.0.0.0:[Railway가 할당한 포트]
🚀 ToadsAI Agent Server running on port [Railway가 할당한 포트]
✅ Server is ready to accept connections on port [Railway가 할당한 포트]
```

## 핵심 원칙
- **절대로** PORT 환경 변수를 수동으로 설정하지 마세요
- Railway가 자동으로 PORT를 할당하도록 두세요
- 서버는 `process.env.PORT`를 읽어서 사용합니다
