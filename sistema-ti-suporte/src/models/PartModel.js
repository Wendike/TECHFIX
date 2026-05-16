const connectDatabase = require('../database/connection');

class PartModel {
  static async create(data) {
    const db = await connectDatabase();

    const result = await db.run(
      `
      INSERT INTO parts (
        supplier_id,
        name,
        sku,
        category,
        description,
        cost_price,
        sale_price,
        min_stock,
        current_stock,
        location,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.supplier_id || null,
        data.name,
        data.sku || null,
        data.category || null,
        data.description || null,
        data.cost_price || 0,
        data.sale_price || 0,
        data.min_stock || 0,
        data.current_stock || 0,
        data.location || null,
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
        parts.*,
        suppliers.company_name AS supplier_name
      FROM parts
      LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
      ORDER BY parts.created_at DESC
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        parts.*,
        suppliers.company_name AS supplier_name,
        suppliers.contact_name AS supplier_contact,
        suppliers.email AS supplier_email,
        suppliers.phone AS supplier_phone
      FROM parts
      LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
      WHERE parts.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async skuExists(sku, ignoreId = null) {
    if (!sku) {
      return false;
    }

    const db = await connectDatabase();

    let query = 'SELECT id FROM parts WHERE sku = ?';
    const params = [sku];

    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }

    const part = await db.get(query, params);
    return !!part;
  }

  static async update(id, data) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE parts
      SET
        supplier_id = ?,
        name = ?,
        sku = ?,
        category = ?,
        description = ?,
        cost_price = ?,
        sale_price = ?,
        min_stock = ?,
        current_stock = ?,
        location = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        data.supplier_id || null,
        data.name,
        data.sku || null,
        data.category || null,
        data.description || null,
        data.cost_price || 0,
        data.sale_price || 0,
        data.min_stock || 0,
        data.current_stock || 0,
        data.location || null,
        data.status || 'active',
        id
      ]
    );
  }

  static async updateStatus(id, status) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE parts
      SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, id]
    );
  }

  static async findSuppliers() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT id, company_name, contact_name, status
      FROM suppliers
      WHERE status = 'active'
      ORDER BY company_name ASC
      `
    );
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM parts');
    return result.total || 0;
  }

  static async countLowStock() {
    const db = await connectDatabase();

    const result = await db.get(
      `
      SELECT COUNT(*) AS total
      FROM parts
      WHERE current_stock <= min_stock
      AND min_stock > 0
      AND status = 'active'
      `
    );

    return result.total || 0;
  }
}

module.exports = PartModel;
