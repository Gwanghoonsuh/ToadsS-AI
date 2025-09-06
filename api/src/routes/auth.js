const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const Customer = require('../models/Customer');
const UserInfo = require('../models/UserInfo');
const googleCloudService = require('../services/googleCloudService');
const router = express.Router();

// Mock user database (in production, use a real database)
const users = [
    {
        id: 1,
        email: 'admin@maritime1.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        name: 'Maritime Admin',
        customerId: 'maritime1',
        companyName: 'Maritime Company 1',
        role: 'admin'
    },
    {
        id: 2,
        email: 'user@maritime2.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        name: 'Maritime User',
        customerId: 'maritime2',
        companyName: 'Maritime Company 2',
        role: 'user'
    },
    {
        id: 3,
        email: 'ghsuh@toads.kr',
        password: '$2a$10$FSiWTZfgC9THHAKevDkbJ.XdoCjvtmzc8.Ucc8N/TZnGkbnug1gTe', // *toads0228
        name: 'Toads Admin',
        customerId: 'toads',
        companyName: '토즈',
        role: 'admin'
    }
];

// Validation schemas
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).required(),
    companyName: Joi.string().min(2).required()
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res, next) => {
    try {
        console.log('🔍 Login request received:', {
            email: req.body.email,
            timestamp: new Date().toISOString()
        });

        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            console.error('❌ Login validation error:', error.details[0].message);
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password } = value;

        // Find user in database using email as ID
        console.log('🔍 Searching user by email (ID):', email);
        const user = await UserInfo.findByEmail(email);
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log('✅ User found:', {
            id: user.id,
            username: user.username,
            customer_id: user.customer_id
        });

        // Check password (plain text comparison)
        console.log('🔍 Validating password (plain text comparison)...');
        console.log('🔍 Password validation details:', {
            inputPassword: password,
            storedPassword: user.user_pwd,
            passwordsMatch: password === user.user_pwd
        });

        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            console.log('❌ Invalid password for user:', email);
            console.log('❌ Password validation failed - plain text comparison failed');
            console.log('   - Input password:', password);
            console.log('   - Stored password:', user.user_pwd);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log('✅ Password validated successfully (plain text match)');

        // Get company information
        console.log('🔍 Fetching company information for customer_id:', user.customer_id);
        const customer = await Customer.findById(user.customer_id);
        if (!customer) {
            console.error('❌ Company not found for customer_id:', user.customer_id);
            return res.status(500).json({ error: 'Company information not found' });
        }
        console.log('✅ Company found:', {
            id: customer.id,
            customer_name: customer.customer_name
        });

        // Initialize customer folder in Google Cloud Storage
        console.log('📁 Initializing customer folder in Google Cloud Storage...');
        try {
            const initResult = await googleCloudService.initializeCustomer(user.customer_id);
            console.log('✅ Customer folder initialization result:', initResult);
        } catch (initError) {
            console.warn('⚠️ Customer folder initialization failed, but continuing login:', initError.message);
            // 폴더 생성 실패해도 로그인은 계속 진행 (로그인 차단하지 않음)
        }

        // Generate JWT token
        console.log('🔑 Generating JWT token...');
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.id, // 이메일이 ID
                customerId: user.customer_id,
                name: user.username,
                companyName: customer.customer_name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        console.log('✅ Login successful for user:', {
            id: user.id,
            username: user.username,
            companyName: customer.customer_name
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.id,
                name: user.username,
                customerId: user.customer_id,
                companyName: customer.customer_name
            }
        });
    } catch (error) {
        console.error('❌ Login error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        next(error);
    }
});

/**
 * POST /api/auth/register
 * User registration
 */
router.post('/register', async (req, res, next) => {
    try {
        console.log('🔍 Registration request received:', {
            body: req.body,
            timestamp: new Date().toISOString()
        });

        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            console.error('❌ Validation error:', error.details[0].message);
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password, name, companyName } = value;

        console.log('📋 Registration data validated:', {
            email,
            name,
            companyName,
            industry,
            hasPassword: !!password
        });

        // Check if user already exists
        console.log('🔍 Checking if user exists...');
        const existingUser = await UserInfo.findByEmail(email);
        if (existingUser) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({ error: 'User already exists' });
        }
        console.log('✅ User does not exist, proceeding...');

        // Check if company already exists
        console.log('🔍 Checking if company exists...');
        let customer = await Customer.findByName(companyName);

        if (!customer) {
            console.log('🏢 Creating new company...');
            // Create new company
            customer = await Customer.create({
                customer_name: companyName
            });
            console.log(`✅ Created new company: ${customer.customer_name} (ID: ${customer.id})`);
        } else {
            console.log(`✅ Using existing company: ${customer.customer_name} (ID: ${customer.id})`);
        }

        // Create new user
        console.log('👤 Creating new user...');
        const newUser = await UserInfo.create({
            id: email, // 이메일을 ID로 사용
            user_pwd: password,
            username: name,
            customer_id: customer.id
        });

        console.log(`✅ Created new user: ${newUser.username} (ID: ${newUser.id})`);

        // Initialize customer folder in Google Cloud Storage
        console.log('📁 Initializing customer folder in Google Cloud Storage...');
        try {
            const initResult = await googleCloudService.initializeCustomer(customer.id);
            console.log('✅ Customer folder initialization result:', initResult);
        } catch (initError) {
            console.warn('⚠️ Customer folder initialization failed, but continuing registration:', initError.message);
            // 폴더 생성 실패해도 회원가입은 계속 진행 (등록 차단하지 않음)
        }

        // Generate JWT token
        console.log('🔑 Generating JWT token...');
        const token = jwt.sign(
            {
                userId: newUser.id,
                email: newUser.id, // 이메일이 ID
                customerId: newUser.customer_id,
                name: newUser.username,
                companyName: customer.customer_name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        console.log('✅ Registration completed successfully');

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser.id,
                email: newUser.id,
                name: newUser.username,
                customerId: newUser.customer_id,
                companyName: customer.customer_name
            }
        });
    } catch (error) {
        console.error('❌ Registration error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            position: error.position,
            internalPosition: error.internalPosition,
            internalQuery: error.internalQuery,
            where: error.where,
            schema: error.schema,
            table: error.table,
            column: error.column,
            dataType: error.dataType,
            constraint: error.constraint,
            file: error.file,
            line: error.line,
            routine: error.routine
        });
        next(error);
    }
});


/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res, next) => {
    try {
        // Get user from database
        const user = await UserInfo.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get company information
        const customer = await Customer.findById(user.customer_id);
        if (!customer) {
            return res.status(500).json({ error: 'Company information not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.id,
                name: user.username,
                customerId: user.customer_id,
                companyName: customer.customer_name
            }
        });
    } catch (error) {
        console.error('Get user info error:', error);
        next(error);
    }
});

module.exports = router;
