const connectDatabase = require('../database/connection');

class UserModel {
  static async create(data) {
    const db = await connectDatabase();

    const result = await db.run(
      `
      INSERT INTO users (
        name,
        email,
        password,
        role,
        phone,
        document,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.name,
        data.email,
        data.password,
        data.role || 'standard',
        data.phone || null,
        data.document || null,
        data.status || 'active'
      ]
    );

    return result.lastID;
  }

  static async findAll() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT 
        id,
        name,
        email,
        role,
        phone,
        document,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT 
        id,
        name,
        email,
        role,
        phone,
        document,
        status,
        avatar,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async findByEmail(email) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT *
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );
  }

  static async emailExists(email, ignoreId = null) {
    const db = await connectDatabase();

    let query = 'SELECT id FROM users WHERE email = ?';
    const params = [email];

    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }

    const user = await db.get(query, params);
    return !!user;
  }

  static async update(id, data) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE users
      SET 
        name = ?,
        email = ?,
        role = ?,
        phone = ?,
        document = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        data.name,
        data.email,
        data.role,
        data.phone || null,
        data.document || null,
        data.status,
        id
      ]
    );
  }

  static async updatePassword(id, hashedPassword) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE users
      SET 
        password = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [hashedPassword, id]
    );
  }

  static async updateStatus(id, status) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE users
      SET 
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, id]
    );
  }

  static async updateLastLogin(id) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE users
      SET 
        last_login_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [id]
    );
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM users');
    return result.total;
  }

  static async countByRole(role) {
    const db = await connectDatabase();

    const result = await db.get(
      'SELECT COUNT(*) AS total FROM users WHERE role = ?',
      [role]
    );

    return result.total;
  }
}

module.exports = UserModel;
