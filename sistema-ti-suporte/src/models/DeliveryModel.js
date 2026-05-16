const connectDatabase = require('../database/connection');

class DeliveryModel {
  static async create(data) {
    const db = await connectDatabase();

    try {
      await db.exec('BEGIN TRANSACTION');

      const existingDelivery = await db.get(
        `
        SELECT id
        FROM deliveries
        WHERE device_id = ?
        LIMIT 1
        `,
        [data.device_id]
      );

      if (existingDelivery) {
        throw new Error('Este dispositivo já possui uma entrega registrada.');
      }

      const device = await db.get(
        `
        SELECT
          devices.*,
          clients.id AS client_id,
          clients.name AS client_name
        FROM devices
        INNER JOIN clients ON clients.id = devices.client_id
        WHERE devices.id = ?
        LIMIT 1
        `,
        [data.device_id]
      );

      if (!device) {
        throw new Error('Dispositivo não encontrado.');
      }

      const result = await db.run(
        `
        INSERT INTO deliveries (
          device_id,
          client_id,
          delivered_by,
          received_by_name,
          notes,
          delivery_date,
          status
        ) VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)
        `,
        [
          data.device_id,
          device.client_id,
          data.delivered_by || null,
          data.received_by_name || device.client_name,
          data.notes || null,
          data.delivery_date || null,
          data.status || 'delivered'
        ]
      );

      if ((data.status || 'delivered') === 'delivered') {
        await db.run(
          `
          UPDATE devices
          SET
            status = 'delivered',
            delivered_at = COALESCE(?, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            data.delivery_date || null,
            data.device_id
          ]
        );
      }

      await db.exec('COMMIT');

      return result.lastID;
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async findAll() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        deliveries.*,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number,
        devices.problem_description,
        devices.status AS device_status,
        clients.name AS client_name,
        clients.phone AS client_phone,
        users.name AS delivered_by_name
      FROM deliveries
      INNER JOIN devices ON devices.id = deliveries.device_id
      INNER JOIN clients ON clients.id = deliveries.client_id
      LEFT JOIN users ON users.id = deliveries.delivered_by
      ORDER BY deliveries.delivery_date DESC
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        deliveries.*,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number,
        devices.problem_description,
        devices.accessories,
        devices.physical_condition,
        devices.status AS device_status,
        devices.received_at,
        devices.delivered_at,
        clients.name AS client_name,
        clients.email AS client_email,
        clients.phone AS client_phone,
        clients.document AS client_document,
        clients.address AS client_address,
        clients.city AS client_city,
        clients.state AS client_state,
        users.name AS delivered_by_name
      FROM deliveries
      INNER JOIN devices ON devices.id = deliveries.device_id
      INNER JOIN clients ON clients.id = deliveries.client_id
      LEFT JOIN users ON users.id = deliveries.delivered_by
      WHERE deliveries.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async update(id, data) {
    const db = await connectDatabase();

    try {
      await db.exec('BEGIN TRANSACTION');

      const delivery = await this.findById(id);

      if (!delivery) {
        throw new Error('Entrega não encontrada.');
      }

      await db.run(
        `
        UPDATE deliveries
        SET
          received_by_name = ?,
          notes = ?,
          delivery_date = ?,
          status = ?
        WHERE id = ?
        `,
        [
          data.received_by_name || delivery.client_name,
          data.notes || null,
          data.delivery_date || delivery.delivery_date,
          data.status || 'delivered',
          id
        ]
      );

      if ((data.status || 'delivered') === 'delivered') {
        await db.run(
          `
          UPDATE devices
          SET
            status = 'delivered',
            delivered_at = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            data.delivery_date || delivery.delivery_date,
            delivery.device_id
          ]
        );
      }

      if (data.status === 'cancelled') {
        await db.run(
          `
          UPDATE devices
          SET
            status = 'repaired',
            delivered_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [delivery.device_id]
        );
      }

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async updateStatus(id, status) {
    const db = await connectDatabase();

    try {
      await db.exec('BEGIN TRANSACTION');

      const delivery = await this.findById(id);

      if (!delivery) {
        throw new Error('Entrega não encontrada.');
      }

      await db.run(
        `
        UPDATE deliveries
        SET status = ?
        WHERE id = ?
        `,
        [status, id]
      );

      if (status === 'delivered') {
        await db.run(
          `
          UPDATE devices
          SET
            status = 'delivered',
            delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [delivery.device_id]
        );
      }

      if (status === 'cancelled') {
        await db.run(
          `
          UPDATE devices
          SET
            status = 'repaired',
            delivered_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [delivery.device_id]
        );
      }

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async findAvailableDevices() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        devices.id,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number,
        devices.problem_description,
        devices.status,
        clients.name AS client_name,
        clients.phone AS client_phone
      FROM devices
      INNER JOIN clients ON clients.id = devices.client_id
      LEFT JOIN deliveries ON deliveries.device_id = devices.id
      WHERE devices.status = 'repaired'
      AND deliveries.id IS NULL
      ORDER BY devices.updated_at DESC
      `
    );
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM deliveries');
    return result.total || 0;
  }
}

module.exports = DeliveryModel;
