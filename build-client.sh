#!/bin/bash

echo "🚀 클라이언트 빌드 스크립트 시작..."

# 현재 디렉토리 확인
echo "📍 현재 디렉토리: $(pwd)"
echo "📁 디렉토리 내용:"
ls -la

# 클라이언트 디렉토리로 이동
echo "📦 클라이언트 디렉토리로 이동..."
cd client

# 클라이언트 디렉토리 확인
echo "📁 클라이언트 디렉토리: $(pwd)"
echo "📁 클라이언트 파일들:"
ls -la

# src 디렉토리 확인
echo "📁 src 디렉토리 확인:"
ls -la src/

# App.tsx 파일 확인
echo "📁 App.tsx 파일 확인:"
if [ -f "src/App.tsx" ]; then
    echo "✅ App.tsx 파일 존재"
    ls -la src/App.tsx
    echo "📄 App.tsx 내용 (첫 5줄):"
    head -5 src/App.tsx
else
    echo "❌ App.tsx 파일이 존재하지 않습니다!"
    exit 1
fi

# index.tsx 파일 확인
echo "📁 index.tsx 파일 확인:"
if [ -f "src/index.tsx" ]; then
    echo "✅ index.tsx 파일 존재"
    ls -la src/index.tsx
    echo "📄 index.tsx 내용 (첫 5줄):"
    head -5 src/index.tsx
else
    echo "❌ index.tsx 파일이 존재하지 않습니다!"
    exit 1
fi

# 의존성 설치
echo "📦 의존성 설치 중..."
npm ci

# TypeScript 컴파일 확인
echo "🔍 TypeScript 컴파일 확인..."
if npx tsc --noEmit --skipLibCheck; then
    echo "✅ TypeScript 컴파일 검사 통과"
else
    echo "⚠️ TypeScript 컴파일 경고가 있지만 계속 진행합니다..."
fi

# 빌드 실행
echo "🔨 빌드 실행 중..."
npm run build

echo "✅ 클라이언트 빌드 완료!"

