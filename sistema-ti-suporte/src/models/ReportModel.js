const connectDatabase = require('../database/connection');

class ReportModel {
  static async getOverview() {
    const db = await connectDatabase();

    const queryOne = async (sql) => {
      const result = await db.get(sql);
      return Number(result?.total || 0);
    };

    const users = await queryOne(`SELECT COUNT(*) AS total FROM users`);
    const clients = await queryOne(`SELECT COUNT(*) AS total FROM clients`);
    const suppliers = await queryOne(`SELECT COUNT(*) AS total FROM suppliers`);
    const devices = await queryOne(`SELECT COUNT(*) AS total FROM devices`);
    const repairs = await queryOne(`SELECT COUNT(*) AS total FROM repairs`);
    const parts = await queryOne(`SELECT COUNT(*) AS total FROM parts`);
    const sales = await queryOne(`SELECT COUNT(*) AS total FROM sales`);
    const deliveries = await queryOne(`SELECT COUNT(*) AS total FROM deliveries`);

    const stockUnits = await queryOne(`
      SELECT COALESCE(SUM(current_stock), 0) AS total
      FROM parts
      WHERE status = 'active'
    `);

    const lowStock = await queryOne(`
      SELECT COUNT(*) AS total
      FROM parts
      WHERE current_stock <= min_stock
      AND min_stock > 0
      AND status = 'active'
    `);

    const totalSales = await queryOne(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM sales
      WHERE status = 'paid'
    `);

    const income = await queryOne(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM financial_transactions
      WHERE type = 'income'
      AND status = 'paid'
    `);

    const expense = await queryOne(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM financial_transactions
      WHERE type = 'expense'
      AND status = 'paid'
    `);

    const openRepairs = await queryOne(`
      SELECT COUNT(*) AS total
      FROM repairs
      WHERE status IN ('open', 'in_progress', 'waiting_parts')
    `);

    const deliveredDevices = await queryOne(`
      SELECT COUNT(*) AS total
      FROM devices
      WHERE status = 'delivered'
    `);

    return {
      users,
      clients,
      suppliers,
      devices,
      repairs,
      parts,
      sales,
      deliveries,
      stockUnits,
      lowStock,
      totalSales,
      income,
      expense,
      balance: income - expense,
      openRepairs,
      deliveredDevices
    };
  }

  static async clients() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        clients.*,
        users.name AS user_name,
        users.email AS user_email
      FROM clients
      LEFT JOIN users ON users.id = clients.user_id
      ORDER BY clients.created_at DESC
    `);
  }

  static async devices() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        devices.*,
        clients.name AS client_name,
        clients.phone AS client_phone,
        users.name AS created_by_name
      FROM devices
      INNER JOIN clients ON clients.id = devices.client_id
      LEFT JOIN users ON users.id = devices.created_by
      ORDER BY devices.created_at DESC
    `);
  }

  static async repairs() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        repairs.*,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number,
        clients.name AS client_name,
        clients.phone AS client_phone,
        technicians.name AS technician_name
      FROM repairs
      INNER JOIN devices ON devices.id = repairs.device_id
      INNER JOIN clients ON clients.id = devices.client_id
      LEFT JOIN users AS technicians ON technicians.id = repairs.technician_id
      ORDER BY repairs.created_at DESC
    `);
  }

  static async inventory() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        parts.*,
        suppliers.company_name AS supplier_name
      FROM parts
      LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
      ORDER BY parts.name ASC
    `);
  }

  static async sales() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        sales.*,
        clients.name AS client_name,
        clients.phone AS client_phone,
        users.name AS user_name,
        repairs.id AS repair_number,
        devices.device_type,
        devices.brand,
        devices.model
      FROM sales
      LEFT JOIN clients ON clients.id = sales.client_id
      LEFT JOIN users ON users.id = sales.user_id
      LEFT JOIN repairs ON repairs.id = sales.repair_id
      LEFT JOIN devices ON devices.id = repairs.device_id
      ORDER BY sales.created_at DESC
    `);
  }

  static async finance() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        financial_transactions.*,
        users.name AS user_name
      FROM financial_transactions
      LEFT JOIN users ON users.id = financial_transactions.user_id
      ORDER BY financial_transactions.created_at DESC
    `);
  }

  static async deliveries() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        deliveries.*,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number,
        clients.name AS client_name,
        clients.phone AS client_phone,
        users.name AS delivered_by_name
      FROM deliveries
      INNER JOIN devices ON devices.id = deliveries.device_id
      INNER JOIN clients ON clients.id = deliveries.client_id
      LEFT JOIN users ON users.id = deliveries.delivered_by
      ORDER BY deliveries.delivery_date DESC
    `);
  }
}

module.exports = ReportModel;
