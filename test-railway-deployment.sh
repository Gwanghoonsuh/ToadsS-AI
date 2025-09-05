#!/bin/bash

# Railway 배포 테스트 스크립트
echo "🚀 Railway 배포 테스트 시작..."

# 1. 환경 변수 확인
echo "📊 환경 변수 확인:"
echo "   - NODE_ENV: ${NODE_ENV:-'development'}"
echo "   - PORT: ${PORT:-'8080'}"
echo "   - DATABASE_URL: ${DATABASE_URL:+'✅ Set'}"
echo "   - JWT_SECRET: ${JWT_SECRET:+'✅ Set'}"
echo "   - GOOGLE_APPLICATION_CREDENTIALS: ${GOOGLE_APPLICATION_CREDENTIALS:+'✅ Set'}"
echo "   - GOOGLE_CLOUD_PROJECT_ID: ${GOOGLE_CLOUD_PROJECT_ID:-'❌ Missing'}"
echo "   - CLIENT_URL: ${CLIENT_URL:-'❌ Missing'}"

# 2. 필수 환경 변수 검증
missing_vars=()

if [ -z "$DATABASE_URL" ]; then
    missing_vars+=("DATABASE_URL")
fi

if [ -z "$JWT_SECRET" ]; then
    missing_vars+=("JWT_SECRET")
fi

if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    missing_vars+=("GOOGLE_APPLICATION_CREDENTIALS")
fi

if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    missing_vars+=("GOOGLE_CLOUD_PROJECT_ID")
fi

if [ -z "$CLIENT_URL" ]; then
    missing_vars+=("CLIENT_URL")
fi

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ 누락된 필수 환경 변수: ${missing_vars[*]}"
    echo "❌ Railway 대시보드에서 Variables 탭을 확인하세요."
    exit 1
fi

# 3. 서버 시작 테스트
echo "🔧 서버 시작 테스트..."
cd server
npm start &
SERVER_PID=$!

# 4. 서버 시작 대기
echo "⏳ 서버 시작 대기 중..."
sleep 10

# 5. 헬스 체크
echo "🏥 헬스 체크 실행..."
HEALTH_URL="http://localhost:${PORT:-8080}/health"
echo "   - URL: $HEALTH_URL"

if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "✅ 서버가 정상적으로 시작되었습니다!"
    echo "✅ 헬스 체크 통과"
else
    echo "❌ 서버 시작 실패 또는 헬스 체크 실패"
    echo "❌ Railway 로그를 확인하세요."
fi

# 6. 서버 종료
echo "🛑 서버 종료..."
kill $SERVER_PID 2>/dev/null || true

echo "🏁 테스트 완료"
