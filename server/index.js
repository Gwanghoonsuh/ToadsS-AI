// 🚀 DEPLOYMENT VERSION: v2 - Automatic Auth
console.log("🚀 DEPLOYMENT VERSION: v2 - Automatic Auth");

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// --- START: 인증 디버깅 코드 ---
console.log("--- STARTING AUTHENTICATION DEBUG ---");
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (credentialsJson) {
    console.log("✅ GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 찾았습니다.");
    console.log(`   - 내용 길이: ${credentialsJson.length} 문자.`);
    try {
        const credentials = JSON.parse(credentialsJson);
        if (credentials.client_email && credentials.private_key) {
            console.log("✅ JSON 파싱에 성공했으며, 필수 키(client_email, private_key)를 포함하고 있습니다.");
            console.log(`   - 서비스 계정 이메일: ${credentials.client_email}`);
        } else {
            console.error("❌ JSON에 필수 키(client_email, private_key)가 없습니다.");
        }
    } catch (e) {
        console.error("❌ 환경 변수의 JSON 내용을 파싱하는 데 실패했습니다.");
        console.error(`   - 오류 메시지: ${e.message}`);
    }
} else {
    console.error("❌ GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 찾을 수 없습니다.");
}
console.log("--- ENDING AUTHENTICATION DEBUG ---");
// --- END: 인증 디버깅 코드 ---

// Database connection
const { query } = require('./src/config/database');
const { initDatabase } = require('./src/config/initDatabase');

const authRoutes = require('./src/routes/auth');
const chatRoutes = require('./src/routes/chat');
const documentRoutes = require('./src/routes/documents');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
// Railway 환경에서는 Railway가 지정한 포트(process.env.PORT)를 사용하고,
// 만약 없다면(로컬 개발 환경이면) 5000번 포트를 사용합니다.
// Force redeploy to fix port issue
const PORT = process.env.PORT || 5000;

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

// Check PostgreSQL environment variables
const requiredPostgresVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
const missingPostgresVars = requiredPostgresVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('❌ These variables are required for production deployment.');

    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Production mode requires all environment variables to be set.');
        console.error('❌ Please check Railway environment variables configuration.');
        process.exit(1);
    } else {
        console.warn('⚠️  Using default values for development. Please set these in production.');

        // Set default values for missing environment variables
        if (!process.env.JWT_SECRET) {
            process.env.JWT_SECRET = 'toads-ai-agent-development-secret-key-2024';
            console.warn('Using default JWT_SECRET for development');
        }
    }
}

// Check PostgreSQL environment variables
if (missingPostgresVars.length > 0) {
    console.error(`❌ Missing PostgreSQL environment variables: ${missingPostgresVars.join(', ')}`);
    console.error('❌ These variables are required for database connection.');

    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Production mode requires all PostgreSQL environment variables to be set.');
        console.error('❌ Please check Railway PostgreSQL service configuration.');
        process.exit(1);
    } else {
        console.warn('⚠️  PostgreSQL environment variables missing for development.');
    }
}

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const dbResult = await query('SELECT NOW() as current_time');

        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'ToadsAI Agent Server',
            database: {
                connected: true,
                currentTime: dbResult.rows[0].current_time
            }
        });
    } catch (error) {
        console.error('❌ Health check database error:', error);
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            service: 'ToadsAI Agent Server',
            database: {
                connected: false,
                error: error.message
            }
        });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app build directory
    app.use(express.static(path.join(__dirname, '../client/build')));

    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
} else {
    // Development mode - return 404 for non-API routes
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Route not found',
            path: req.originalUrl,
            message: 'In development mode, please use the React dev server'
        });
    });
}

// Error handling middleware
app.use(errorHandler);

// Start server
// 서버 시작
async function startServer() {
    try {
        console.log('🚀 Starting ToadsAI Agent Server...');
        console.log('📊 Environment variables check:');
        console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   - PORT: ${process.env.PORT || '5000'} ${process.env.PORT ? '(Railway assigned)' : '(Using default)'}`);
        console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
        console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
        console.log(`   - GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Set' : '❌ Missing'}`);
        console.log(`   - GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || '❌ Missing'}`);
        console.log(`   - CLIENT_URL: ${process.env.CLIENT_URL || '❌ Missing'}`);

        // 포트 설정 상세 확인
        console.log('🔍 Port configuration details:');
        console.log(`   - process.env.PORT: ${process.env.PORT || 'undefined'}`);
        console.log(`   - Final PORT value: ${PORT}`);
        console.log(`   - PORT type: ${typeof PORT}`);
        console.log(`   - PORT parsed: ${parseInt(PORT)}`);

        // Railway 포트 확인
        if (!process.env.PORT) {
            console.warn('⚠️  process.env.PORT is not set by Railway');
            console.warn('⚠️  Using default port 5000 for local development');
        } else {
            console.log(`✅ Railway assigned port: ${process.env.PORT}`);
        }


        // 서버 시작
        console.log(`🌐 Starting server on 0.0.0.0:${PORT}`);

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 ToadsAI Agent Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`🌐 Server listening on 0.0.0.0:${PORT}`);
            console.log(`✅ Server is ready to accept connections on port ${PORT}`);
            console.log(`🔍 CRITICAL: Railway must route traffic to port ${PORT} (not 5000!)`);

            // Google Cloud Service status
            const googleCloudService = require('./src/services/googleCloudService');
            if (googleCloudService.isTestMode) {
                console.log('🔧 Google Cloud Service: TEST MODE (in-memory storage)');
                console.log('⚠️  To enable production mode, ensure GOOGLE_APPLICATION_CREDENTIALS is set');
            } else {
                console.log('☁️ Google Cloud Service: PRODUCTION MODE (real GCS)');
                console.log(`📋 Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
                console.log(`🌏 Region: ${process.env.GOOGLE_CLOUD_REGION || 'asia-northeast3'}`);
            }

            console.log('✅ Server startup completed successfully');
        });

        // 서버 오류 처리
        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
            } else if (error.code === 'EACCES') {
                console.error(`❌ Permission denied to bind to port ${PORT}`);
            }
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🛑 SIGINT received, shutting down gracefully');
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

startServer();

module.exports = app;
