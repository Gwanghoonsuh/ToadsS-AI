const { Pool } = require('pg');

// PostgreSQL 연결 설정
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_9PXN6xYgoiMG@ep-young-wave-a118y6y2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function testDatabase() {
    try {
        console.log('🔍 데이터베이스 연결 테스트 중...');

        // Customer 테이블 확인
        console.log('\n📋 Customer 테이블 데이터:');
        const customerResult = await pool.query('SELECT * FROM customer ORDER BY id');
        console.log('Customer rows:', customerResult.rows);

        // UserInfo 테이블 확인
        console.log('\n👤 UserInfo 테이블 데이터:');
        const userResult = await pool.query('SELECT * FROM userinfo ORDER BY id');
        console.log('UserInfo rows:', userResult.rows);

        // 특정 사용자 확인
        console.log('\n🔍 특정 사용자 확인 (ghsuh@toads.kr):');
        const specificUser = await pool.query('SELECT * FROM userinfo WHERE id = $1', ['ghsuh@toads.kr']);
        console.log('Specific user:', specificUser.rows);

        if (specificUser.rows.length > 0) {
            const user = specificUser.rows[0];
            console.log('\n📊 사용자 정보:');
            console.log('ID (이메일):', user.id);
            console.log('Username:', user.username);
            console.log('Password:', user.user_pwd);
            console.log('Customer ID:', user.customer_id);
            console.log('Created At:', user.created_at);

            // 비밀번호 테스트
            console.log('\n🔐 비밀번호 테스트:');
            const testPassword = '*toads0228';
            const isPasswordMatch = testPassword === user.user_pwd;
            console.log('Test password:', testPassword);
            console.log('Stored password:', user.user_pwd);
            console.log('Password match:', isPasswordMatch);
        } else {
            console.log('❌ 사용자를 찾을 수 없습니다.');

            // 테이블이 존재하는지 확인
            console.log('\n🔍 테이블 존재 여부 확인:');
            const tableCheck = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('customer', 'userinfo')
                ORDER BY table_name
            `);
            console.log('Existing tables:', tableCheck.rows);
        }

    } catch (error) {
        console.error('❌ 데이터베이스 오류:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testDatabase();
