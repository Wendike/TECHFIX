const connectDatabase = require('../database/connection');

class SupplierModel {
  static async create(data) {
    const db = await connectDatabase();

    const result = await db.run(
      `
      INSERT INTO suppliers (
        user_id,
        company_name,
        contact_name,
        email,
        phone,
        document,
        address,
        city,
        state,
        zip_code,
        notes,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.user_id || null,
        data.company_name,
        data.contact_name || null,
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
        suppliers.*,
        users.name AS user_name,
        users.email AS user_email
      FROM suppliers
      LEFT JOIN users ON users.id = suppliers.user_id
      ORDER BY suppliers.created_at DESC
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        suppliers.*,
        users.name AS user_name,
        users.email AS user_email
      FROM suppliers
      LEFT JOIN users ON users.id = suppliers.user_id
      WHERE suppliers.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async update(id, data) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE suppliers
      SET
        user_id = ?,
        company_name = ?,
        contact_name = ?,
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
        data.company_name,
        data.contact_name || null,
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
      UPDATE suppliers
      SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, id]
    );
  }

  static async getSupplierUsers() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT id, name, email, role, status
      FROM users
      WHERE role = 'supplier'
      ORDER BY name ASC
      `
    );
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM suppliers');
    return result.total || 0;
  }
}

module.exports = SupplierModel;
