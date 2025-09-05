const { query } = require('./database');

// 데이터베이스 테이블 초기화
async function initDatabase() {
    try {
        console.log('🔍 Checking database tables...');

        // Customer 테이블 생성
        await query(`
            CREATE TABLE IF NOT EXISTS customer (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Customer table ready');

        // UserInfo 테이블 생성
        await query(`
            CREATE TABLE IF NOT EXISTS userinfo (
                id VARCHAR(255) PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                user_pwd VARCHAR(255) NOT NULL,
                customer_id INTEGER REFERENCES customer(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ UserInfo table ready');

        // 인덱스 생성 (테이블 생성 후 약간의 지연)
        console.log('🔍 Creating database indexes...');

        try {
            await query(`
                CREATE INDEX IF NOT EXISTS idx_userinfo_id ON userinfo(id);
            `);
            console.log('✅ UserInfo id index created');
        } catch (error) {
            console.log('⚠️ UserInfo id index creation skipped:', error.message);
        }

        try {
            await query(`
                CREATE INDEX IF NOT EXISTS idx_userinfo_customer_id ON userinfo(customer_id);
            `);
            console.log('✅ UserInfo customer_id index created');
        } catch (error) {
            console.log('⚠️ UserInfo customer_id index creation skipped:', error.message);
        }

        try {
            await query(`
                CREATE INDEX IF NOT EXISTS idx_customer_name ON customer(customer_name);
            `);
            console.log('✅ Customer name index created');
        } catch (error) {
            console.log('⚠️ Customer name index creation skipped:', error.message);
        }

        console.log('✅ Database indexes ready');

        console.log('🎉 Database initialization completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

module.exports = { initDatabase };
