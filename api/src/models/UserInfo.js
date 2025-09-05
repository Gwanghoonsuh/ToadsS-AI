const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserInfo {
    constructor(data) {
        this.id = data.id; // 이메일
        this.username = data.username; // 사용자 이름
        this.user_pwd = data.user_pwd; // 비밀번호
        this.customer_id = data.customer_id; // 회사 코드와 연결
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // 사용자 생성
    static async create(userData) {
        const { id, user_pwd, username, customer_id } = userData;

        // 비밀번호를 평문으로 저장
        const text = `
            INSERT INTO userinfo (id, user_pwd, username, customer_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id, username, customer_id, created_at, updated_at
        `;

        const values = [id, user_pwd, username, customer_id];
        const result = await query(text, values);

        return new UserInfo(result.rows[0]);
    }

    // 이메일로 사용자 조회
    static async findByEmail(email) {
        const text = 'SELECT * FROM userinfo WHERE id = $1';
        const result = await query(text, [email]);

        if (result.rows.length === 0) {
            return null;
        }

        return new UserInfo(result.rows[0]);
    }

    // ID로 사용자 조회
    static async findById(id) {
        const text = 'SELECT * FROM userinfo WHERE id = $1';
        const result = await query(text, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return new UserInfo(result.rows[0]);
    }

    // 회사별 사용자 조회
    static async findByCustomerId(customerId) {
        const text = 'SELECT * FROM userinfo WHERE customer_id = $1 ORDER BY created_at DESC';
        const result = await query(text, [customerId]);

        return result.rows.map(row => new UserInfo(row));
    }

    // 비밀번호 검증 (평문 비교)
    async validatePassword(password) {
        return password === this.user_pwd;
    }

    // 사용자 정보 업데이트
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && key !== 'password') {
                fields.push(`${key} = $${paramCount}`);
                values.push(updateData[key]);
                paramCount++;
            }
        });

        // 비밀번호 업데이트가 있는 경우 (평문으로 저장)
        if (updateData.user_pwd) {
            fields.push(`user_pwd = $${paramCount}`);
            values.push(updateData.user_pwd);
            paramCount++;
        }

        if (fields.length === 0) {
            return this;
        }

        fields.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        values.push(this.id);

        const text = `UPDATE userinfo SET ${fields.join(', ')} WHERE id = $${paramCount + 1} RETURNING id, username, customer_id, created_at, updated_at`;
        const result = await query(text, values);

        return new UserInfo(result.rows[0]);
    }

    // 사용자 삭제
    async delete() {
        const text = 'DELETE FROM userinfo WHERE id = $1';
        await query(text, [this.id]);
        return true;
    }

    // 비밀번호 제외한 사용자 정보 반환
    toJSON() {
        const { user_pwd, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }
}

module.exports = UserInfo;
