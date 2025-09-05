const { Pool } = require('pg');

// PostgreSQL 연결 설정
// Railway 환경 변수 참조 방식 사용
const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// 연결 테스트
pool.on('connect', (client) => {
    console.log('✅ PostgreSQL database connected');
    console.log(`📊 Connection info: ${client.host}:${client.port}/${client.database}`);
    console.log(`🔧 Using Railway environment variables: PGHOST=${process.env.PGHOST}, PGPORT=${process.env.PGPORT}, PGUSER=${process.env.PGUSER}, PGDATABASE=${process.env.PGDATABASE}`);
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL database error:', err);
    console.error('❌ Database error details:', {
        code: err.code,
        message: err.message,
        detail: err.detail,
        hint: err.hint
    });
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

// 연결 종료
const close = async () => {
    await pool.end();
    console.log('🔌 PostgreSQL database connection closed');
};

module.exports = {
    pool,
    query,
    close
};
