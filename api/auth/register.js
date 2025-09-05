const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { Pool } = require('pg');

// PostgreSQL 연결 설정
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// 데이터베이스 쿼리 헬퍼 함수
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Database query executed:', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
};

// Validation schema
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).required(),
    companyName: Joi.string().min(2).required()
});

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
            hasPassword: !!password
        });

        // Check if user already exists
        console.log('🔍 Checking if user exists...');
        const existingUserResult = await query('SELECT * FROM userinfo WHERE id = $1', [email]);
        if (existingUserResult.rows.length > 0) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({ error: 'User already exists' });
        }
        console.log('✅ User does not exist, proceeding...');

        // Check if company already exists
        console.log('🔍 Checking if company exists...');
        const customerResult = await query('SELECT * FROM customer WHERE customer_name = $1', [companyName]);
        let customer;

        if (customerResult.rows.length === 0) {
            console.log('🏢 Creating new company...');
            // Create new company
            const newCustomerResult = await query(
                'INSERT INTO customer (customer_name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING *',
                [companyName]
            );
            customer = newCustomerResult.rows[0];
            console.log(`✅ Created new company: ${customer.customer_name} (ID: ${customer.id})`);
        } else {
            customer = customerResult.rows[0];
            console.log(`✅ Using existing company: ${customer.customer_name} (ID: ${customer.id})`);
        }

        // Create new user
        console.log('👤 Creating new user...');
        const newUserResult = await query(
            'INSERT INTO userinfo (id, user_pwd, username, customer_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
            [email, password, name, customer.id]
        );
        const newUser = newUserResult.rows[0];

        console.log(`✅ Created new user: ${newUser.username} (ID: ${newUser.id})`);

        // Generate JWT token
        console.log('🔑 Generating JWT token...');
        const token = jwt.sign(
            {
                userId: newUser.id,
                email: newUser.id,
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
                customerId: parseInt(newUser.customer_id),
                companyName: customer.customer_name
            }
        });
    } catch (error) {
        console.error('❌ Registration error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ error: 'Internal server error' });
    }
}
