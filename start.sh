#!/bin/bash

echo "🚀 ToadsAI 서비스 시작 중..."

# 루트 디렉토리에서 서버 시작 (npm이 루트에 설치되어 있음)
echo "📁 현재 디렉토리: $(pwd)"
echo "📁 디렉토리 내용:"
ls -la

# 루트에서 서버 시작 명령어 실행
echo "🚀 서버 시작 중..."
npm run start
