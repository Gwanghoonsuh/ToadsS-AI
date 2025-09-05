const { query } = require('./server/src/config/database');

async function checkDatabase() {
    try {
        console.log('🔍 데이터베이스 연결 테스트 중...');
        
        // Customer 테이블 확인
        console.log('\n📋 Customer 테이블 데이터:');
        const customerResult = await query('SELECT * FROM customer ORDER BY id');
        console.log('Customer rows:', customerResult.rows);
        
        // UserInfo 테이블 확인
        console.log('\n👤 UserInfo 테이블 데이터:');
        const userResult = await query('SELECT * FROM userinfo ORDER BY id');
        console.log('UserInfo rows:', userResult.rows);
        
        // 특정 사용자 확인
        console.log('\n🔍 특정 사용자 확인 (ghsuh@toads.kr):');
        const specificUser = await query('SELECT * FROM userinfo WHERE id = $1', ['ghsuh@toads.kr']);
        console.log('Specific user:', specificUser.rows);
        
        if (specificUser.rows.length > 0) {
            const user = specificUser.rows[0];
            console.log('\n📊 사용자 정보:');
            console.log('ID (이메일):', user.id);
            console.log('Username:', user.username);
            console.log('Password:', user.user_pwd);
            console.log('Customer ID:', user.customer_id);
            console.log('Created At:', user.created_at);
        } else {
            console.log('❌ 사용자를 찾을 수 없습니다.');
        }
        
    } catch (error) {
        console.error('❌ 데이터베이스 오류:', error);
    } finally {
        process.exit(0);
    }
}

checkDatabase();
