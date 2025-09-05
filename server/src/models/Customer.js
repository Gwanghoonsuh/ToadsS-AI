const { query } = require('../config/database');

class Customer {
    constructor(data) {
        this.id = data.id; // 회사 코드
        this.customer_name = data.customer_name; // 회사명
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // 회사 생성
    static async create(customerData) {
        const { customer_name } = customerData;

        const text = `
            INSERT INTO customer (customer_name, created_at, updated_at)
            VALUES ($1, NOW(), NOW())
            RETURNING *
        `;

        const values = [customer_name];
        const result = await query(text, values);

        return new Customer(result.rows[0]);
    }

    // 회사 코드로 조회
    static async findById(id) {
        const text = 'SELECT * FROM customer WHERE id = $1';
        const result = await query(text, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return new Customer(result.rows[0]);
    }

    // 회사명으로 조회
    static async findByName(customer_name) {
        const text = 'SELECT * FROM customer WHERE customer_name = $1';
        const result = await query(text, [customer_name]);

        if (result.rows.length === 0) {
            return null;
        }

        return new Customer(result.rows[0]);
    }

    // 모든 회사 조회
    static async findAll() {
        const text = 'SELECT * FROM customer ORDER BY created_at DESC';
        const result = await query(text);

        return result.rows.map(row => new Customer(row));
    }

    // 회사 정보 업데이트
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(updateData[key]);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            return this;
        }

        fields.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        values.push(this.id);

        const text = `UPDATE customer SET ${fields.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`;
        const result = await query(text, values);

        return new Customer(result.rows[0]);
    }

    // 회사 삭제
    async delete() {
        const text = 'DELETE FROM customer WHERE id = $1';
        await query(text, [this.id]);
        return true;
    }
}

module.exports = Customer;
