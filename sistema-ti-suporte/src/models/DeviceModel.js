const connectDatabase = require('../database/connection');

class DeviceModel {
  static async create(data) {
    const db = await connectDatabase();

    const result = await db.run(
      `
      INSERT INTO devices (
        client_id,
        created_by,
        device_type,
        brand,
        model,
        serial_number,
        problem_description,
        accessories,
        password_or_pin,
        physical_condition,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.client_id,
        data.created_by || null,
        data.device_type,
        data.brand || null,
        data.model || null,
        data.serial_number || null,
        data.problem_description,
        data.accessories || null,
        data.password_or_pin || null,
        data.physical_condition || null,
        data.status || 'received'
      ]
    );

    return result.lastID;
  }

  static async findAll() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        devices.*,
        clients.name AS client_name,
        clients.phone AS client_phone,
        clients.email AS client_email,
        users.name AS created_by_name
      FROM devices
      INNER JOIN clients ON clients.id = devices.client_id
      LEFT JOIN users ON users.id = devices.created_by
      ORDER BY devices.created_at DESC
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        devices.*,
        clients.name AS client_name,
        clients.phone AS client_phone,
        clients.email AS client_email,
        clients.document AS client_document,
        clients.address AS client_address,
        clients.city AS client_city,
        clients.state AS client_state,
        users.name AS created_by_name
      FROM devices
      INNER JOIN clients ON clients.id = devices.client_id
      LEFT JOIN users ON users.id = devices.created_by
      WHERE devices.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async update(id, data) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE devices
      SET
        client_id = ?,
        device_type = ?,
        brand = ?,
        model = ?,
        serial_number = ?,
        problem_description = ?,
        accessories = ?,
        password_or_pin = ?,
        physical_condition = ?,
        status = ?,
        delivered_at = CASE
          WHEN ? = 'delivered' AND delivered_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE delivered_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        data.client_id,
        data.device_type,
        data.brand || null,
        data.model || null,
        data.serial_number || null,
        data.problem_description,
        data.accessories || null,
        data.password_or_pin || null,
        data.physical_condition || null,
        data.status || 'received',
        data.status || 'received',
        id
      ]
    );
  }

  static async updateStatus(id, status) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE devices
      SET
        status = ?,
        delivered_at = CASE
          WHEN ? = 'delivered' AND delivered_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE delivered_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, status, id]
    );
  }

  static async findActiveClients() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT id, name, email, phone, document
      FROM clients
      WHERE status = 'active'
      ORDER BY name ASC
      `
    );
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM devices');
    return result.total || 0;
  }

  static async countByStatus(status) {
    const db = await connectDatabase();

    const result = await db.get(
      'SELECT COUNT(*) AS total FROM devices WHERE status = ?',
      [status]
    );

    return result.total || 0;
  }
}

module.exports = DeviceModel;
