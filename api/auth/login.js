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
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
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
        const userResult = await query('SELECT * FROM userinfo WHERE id = $1', [email]);
        if (userResult.rows.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = userResult.rows[0];
        console.log('✅ User found:', {
            id: user.id,
            username: user.username,
            customer_id: user.customer_id
        });

        // Check password (평문 비교)
        console.log('🔍 Validating password...');
        const isValidPassword = password === user.user_pwd;
        if (!isValidPassword) {
            console.log('❌ Invalid password for user:', email);
            console.log('Expected:', user.user_pwd);
            console.log('Received:', password);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log('✅ Password validated successfully');

        // Get company information
        console.log('🔍 Fetching company information for customer_id:', user.customer_id);
        const customerResult = await query('SELECT * FROM customer WHERE id = $1', [user.customer_id]);
        if (customerResult.rows.length === 0) {
            console.error('❌ Company not found for customer_id:', user.customer_id);
            return res.status(500).json({ error: 'Company information not found' });
        }
        
        const customer = customerResult.rows[0];
        console.log('✅ Company found:', {
            id: customer.id,
            customer_name: customer.customer_name
        });

        // Generate JWT token
        console.log('🔑 Generating JWT token...');
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.id,
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
                customerId: parseInt(user.customer_id),
                companyName: customer.customer_name
            }
        });
    } catch (error) {
        console.error('❌ Login error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ error: 'Internal server error' });
    }
}
