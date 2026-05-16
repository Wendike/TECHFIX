const connectDatabase = require('../database/connection');

class ClientModel {
  static async create(data) {
    const db = await connectDatabase();

    const result = await db.run(
      `
      INSERT INTO clients (
        user_id,
        name,
        email,
        phone,
        document,
        address,
        city,
        state,
        zip_code,
        notes,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.user_id || null,
        data.name,
        data.email || null,
        data.phone || null,
        data.document || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.zip_code || null,
        data.notes || null,
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
        clients.*,
        users.name AS user_name,
        users.email AS user_email
      FROM clients
      LEFT JOIN users ON users.id = clients.user_id
      ORDER BY clients.created_at DESC
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        clients.*,
        users.name AS user_name,
        users.email AS user_email
      FROM clients
      LEFT JOIN users ON users.id = clients.user_id
      WHERE clients.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async update(id, data) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE clients
      SET
        user_id = ?,
        name = ?,
        email = ?,
        phone = ?,
        document = ?,
        address = ?,
        city = ?,
        state = ?,
        zip_code = ?,
        notes = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        data.user_id || null,
        data.name,
        data.email || null,
        data.phone || null,
        data.document || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.zip_code || null,
        data.notes || null,
        data.status || 'active',
        id
      ]
    );
  }

  static async updateStatus(id, status) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE clients
      SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, id]
    );
  }

  static async getClientUsers() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT id, name, email, role, status
      FROM users
      WHERE role = 'client'
      ORDER BY name ASC
      `
    );
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM clients');
    return result.total || 0;
  }
}

module.exports = ClientModel;
