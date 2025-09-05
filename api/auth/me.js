const jwt = require('jsonwebtoken');
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

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('🔍 Token decoded:', {
            userId: decoded.userId,
            email: decoded.email,
            customerId: decoded.customerId
        });

        // Get user from database
        const userResult = await query('SELECT * FROM userinfo WHERE id = $1', [decoded.email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];

        // Get company information
        const customerResult = await query('SELECT * FROM customer WHERE id = $1', [user.customer_id]);
        if (customerResult.rows.length === 0) {
            return res.status(500).json({ error: 'Company information not found' });
        }
        const customer = customerResult.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.id,
                name: user.username,
                customerId: parseInt(user.customer_id),
                companyName: customer.customer_name
            }
        });
    } catch (error) {
        console.error('❌ Get user error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}
