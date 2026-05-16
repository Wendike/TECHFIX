const connectDatabase = require('../database/connection');
const FinanceModel = require('./FinanceModel');

class SaleModel {
  static async recalculateTotal(db, saleId) {
    const sale = await db.get(
      `
      SELECT
        sales.discount,
        COALESCE(repairs.total_cost, 0) AS repair_total
      FROM sales
      LEFT JOIN repairs ON repairs.id = sales.repair_id
      WHERE sales.id = ?
      LIMIT 1
      `,
      [saleId]
    );

    const items = await db.get(
      `
      SELECT COALESCE(SUM(total_price), 0) AS items_total
      FROM sale_items
      WHERE sale_id = ?
      `,
      [saleId]
    );

    const repairTotal = Number(sale?.repair_total || 0);
    const itemsTotal = Number(items?.items_total || 0);
    const discount = Number(sale?.discount || 0);
    const totalAmount = Math.max(0, repairTotal + itemsTotal - discount);

    await db.run(
      `
      UPDATE sales
      SET
        total_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [totalAmount, saleId]
    );

    return totalAmount;
  }

  static async create(data) {
    const db = await connectDatabase();

    const result = await db.run(
      `
      INSERT INTO sales (
        client_id,
        user_id,
        repair_id,
        total_amount,
        discount,
        status,
        payment_method,
        sold_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END)
      `,
      [
        data.client_id || null,
        data.user_id || null,
        data.repair_id || null,
        0,
        Number(data.discount || 0),
        data.status || 'draft',
        data.payment_method || null,
        data.status || 'draft'
      ]
    );

    await this.recalculateTotal(db, result.lastID);

    return result.lastID;
  }

  static async findAll() {
    const db = await connectDatabase();

    return db.all(
      `
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
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        sales.*,
        clients.name AS client_name,
        clients.email AS client_email,
        clients.phone AS client_phone,
        clients.document AS client_document,
        users.name AS user_name,
        repairs.id AS repair_number,
        repairs.total_cost AS repair_total,
        repairs.status AS repair_status,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number
      FROM sales
      LEFT JOIN clients ON clients.id = sales.client_id
      LEFT JOIN users ON users.id = sales.user_id
      LEFT JOIN repairs ON repairs.id = sales.repair_id
      LEFT JOIN devices ON devices.id = repairs.device_id
      WHERE sales.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async update(id, data) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE sales
      SET
        client_id = ?,
        repair_id = ?,
        discount = ?,
        status = ?,
        payment_method = ?,
        sold_at = CASE
          WHEN ? = 'paid' AND sold_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE sold_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        data.client_id || null,
        data.repair_id || null,
        Number(data.discount || 0),
        data.status || 'draft',
        data.payment_method || null,
        data.status || 'draft',
        id
      ]
    );

    await this.recalculateTotal(db, id);
    await FinanceModel.syncSaleTransaction(id);
  }

  static async updateStatus(id, status) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE sales
      SET
        status = ?,
        sold_at = CASE
          WHEN ? = 'paid' AND sold_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE sold_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, status, id]
    );

    await FinanceModel.syncSaleTransaction(id);
  }

  static async findItems(saleId) {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        sale_items.*,
        parts.name AS part_name,
        parts.sku AS part_sku,
        parts.current_stock,
        parts.location
      FROM sale_items
      LEFT JOIN parts ON parts.id = sale_items.part_id
      WHERE sale_items.sale_id = ?
      ORDER BY sale_items.created_at DESC
      `,
      [saleId]
    );
  }

  static async addItem(saleId, data) {
    const db = await connectDatabase();

    const quantity = Number(data.quantity || 0);

    if (!quantity || quantity <= 0) {
      throw new Error('A quantidade precisa ser maior que zero.');
    }

    try {
      await db.exec('BEGIN TRANSACTION');

      const sale = await this.findById(saleId);

      if (!sale) {
        throw new Error('Venda não encontrada.');
      }

      if (sale.status === 'paid' || sale.status === 'cancelled') {
        throw new Error('Não é possível alterar itens de uma venda paga ou cancelada.');
      }

      const part = await db.get(
        `
        SELECT *
        FROM parts
        WHERE id = ?
        LIMIT 1
        `,
        [data.part_id]
      );

      if (!part) {
        throw new Error('Peça não encontrada.');
      }

      if (part.status !== 'active') {
        throw new Error('Essa peça está inativa.');
      }

      if (Number(part.current_stock) < quantity) {
        throw new Error('Estoque insuficiente para vender essa peça.');
      }

      const unitPrice = Number(data.unit_price || part.sale_price || 0);
      const totalPrice = unitPrice * quantity;

      await db.run(
        `
        INSERT INTO sale_items (
          sale_id,
          part_id,
          quantity,
          unit_price,
          total_price
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [
          saleId,
          data.part_id,
          quantity,
          unitPrice,
          totalPrice
        ]
      );

      await db.run(
        `
        UPDATE parts
        SET
          current_stock = current_stock - ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [quantity, data.part_id]
      );

      await db.run(
        `
        INSERT INTO inventory_movements (
          part_id,
          user_id,
          movement_type,
          quantity,
          unit_cost,
          unit_price,
          reason,
          reference_type,
          reference_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          data.part_id,
          data.user_id || null,
          'exit',
          quantity,
          part.cost_price || 0,
          unitPrice,
          data.reason || `Venda #${saleId}`,
          'sale',
          saleId
        ]
      );

      await this.recalculateTotal(db, saleId);

      await db.run(
        `
        UPDATE sales
        SET
          status = CASE
            WHEN status = 'draft' THEN 'pending'
            ELSE status
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [saleId]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async removeItem(saleId, itemId, userId) {
    const db = await connectDatabase();

    try {
      await db.exec('BEGIN TRANSACTION');

      const sale = await this.findById(saleId);

      if (!sale) {
        throw new Error('Venda não encontrada.');
      }

      if (sale.status === 'paid' || sale.status === 'cancelled') {
        throw new Error('Não é possível remover itens de uma venda paga ou cancelada.');
      }

      const item = await db.get(
        `
        SELECT
          sale_items.*,
          parts.cost_price,
          parts.name AS part_name
        FROM sale_items
        LEFT JOIN parts ON parts.id = sale_items.part_id
        WHERE sale_items.id = ?
        AND sale_items.sale_id = ?
        LIMIT 1
        `,
        [itemId, saleId]
      );

      if (!item) {
        throw new Error('Item da venda não encontrado.');
      }

      await db.run(
        `
        UPDATE parts
        SET
          current_stock = current_stock + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [item.quantity, item.part_id]
      );

      await db.run(
        `
        DELETE FROM sale_items
        WHERE id = ?
        AND sale_id = ?
        `,
        [itemId, saleId]
      );

      await db.run(
        `
        INSERT INTO inventory_movements (
          part_id,
          user_id,
          movement_type,
          quantity,
          unit_cost,
          unit_price,
          reason,
          reference_type,
          reference_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.part_id,
          userId || null,
          'return',
          item.quantity,
          item.cost_price || 0,
          item.unit_price || 0,
          `Remoção/devolução do item da venda #${saleId}`,
          'sale',
          saleId
        ]
      );

      await this.recalculateTotal(db, saleId);

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async findClients() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT id, name, phone, email, document
      FROM clients
      WHERE status = 'active'
      ORDER BY name ASC
      `
    );
  }

  static async findRepairs() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        repairs.id,
        repairs.total_cost,
        repairs.status,
        clients.name AS client_name,
        devices.device_type,
        devices.brand,
        devices.model
      FROM repairs
      INNER JOIN devices ON devices.id = repairs.device_id
      INNER JOIN clients ON clients.id = devices.client_id
      WHERE repairs.status != 'cancelled'
      ORDER BY repairs.created_at DESC
      `
    );
  }

  static async findParts() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        parts.*,
        suppliers.company_name AS supplier_name
      FROM parts
      LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
      WHERE parts.status = 'active'
      ORDER BY parts.name ASC
      `
    );
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM sales');
    return result.total || 0;
  }
}

module.exports = SaleModel;
