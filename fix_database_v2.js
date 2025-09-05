const { Pool } = require('pg');

// PostgreSQL 연결 설정
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_9PXN6xYgoiMG@ep-young-wave-a118y6y2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function fixDatabase() {
    try {
        console.log('🔧 데이터베이스 수정 중...');

        // 현재 데이터 확인
        console.log('\n📋 현재 UserInfo 데이터:');
        const currentResult = await pool.query('SELECT * FROM userinfo');
        console.log('Current rows:', currentResult.rows);

        // 기존 데이터 삭제
        console.log('\n🗑️ 기존 데이터 삭제 중...');
        const deleteResult = await pool.query('DELETE FROM userinfo');
        console.log('Deleted rows:', deleteResult.rowCount);

        // 올바른 데이터로 다시 삽입
        console.log('\n➕ 올바른 데이터 삽입 중...');
        const insertResult = await pool.query(
            'INSERT INTO userinfo (id, user_pwd, username, customer_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
            ['ghsuh@toads.kr', '*toads0228', '서광훈', 1]
        );
        console.log('Inserted user:', insertResult.rows[0]);

        // 수정된 데이터 확인
        console.log('\n📋 수정된 UserInfo 데이터:');
        const updatedResult = await pool.query('SELECT * FROM userinfo');
        console.log('Updated rows:', updatedResult.rows);

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

            // 비밀번호 테스트
            console.log('\n🔐 비밀번호 테스트:');
            const testPassword = '*toads0228';
            const isPasswordMatch = testPassword === user.user_pwd;
            console.log('Test password:', testPassword);
            console.log('Stored password:', user.user_pwd);
            console.log('Password match:', isPasswordMatch);
        }

    } catch (error) {
        console.error('❌ 데이터베이스 오류:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

fixDatabase();
