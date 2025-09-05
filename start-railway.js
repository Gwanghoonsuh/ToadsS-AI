#!/usr/bin/env node

// Railway 배포용 시작 스크립트
console.log('🚀 Starting ToadsAI Agent Server for Railway...');

// 환경 변수 확인
console.log('📊 Environment check:');
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   - PORT: ${process.env.PORT || '5000'} ${process.env.PORT ? '(Railway assigned)' : '(Using default)'}`);
console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);

// 포트 설정 확인
if (!process.env.PORT) {
    console.warn('⚠️  PORT environment variable not set by Railway');
    console.warn('⚠️  This may cause connection issues. Railway should set this automatically.');
}

// 필수 환경 변수 검증
const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('❌ Please check Railway environment variables configuration.');
    process.exit(1);
}

// 서버 시작
try {
    require('./server/index.js');
} catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
}
