// Vercel 서버리스 함수 - Express 서버를 Vercel 환경에 맞게 래핑
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Database connection
const { query } = require('../server/src/config/database');
const { initDatabase } = require('../server/src/config/initDatabase');

const authRoutes = require('../server/src/routes/auth');
const chatRoutes = require('../server/src/routes/chat');
const documentRoutes = require('../server/src/routes/documents');
const errorHandler = require('../server/src/middleware/errorHandler');

const app = express();

// Trust proxy for Vercel deployment
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

// Error handling middleware
app.use(errorHandler);

// Vercel 서버리스 함수로 export
module.exports = app;
