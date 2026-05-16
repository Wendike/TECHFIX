const connectDatabase = require('../database/connection');

class InventoryModel {
  static async getStats() {
    const db = await connectDatabase();

    const totalParts = await db.get(`
      SELECT COUNT(*) AS total
      FROM parts
      WHERE status = 'active'
    `);

    const totalUnits = await db.get(`
      SELECT COALESCE(SUM(current_stock), 0) AS total
      FROM parts
      WHERE status = 'active'
    `);

    const lowStock = await db.get(`
      SELECT COUNT(*) AS total
      FROM parts
      WHERE current_stock <= min_stock
      AND min_stock > 0
      AND status = 'active'
    `);

    const inventoryCost = await db.get(`
      SELECT COALESCE(SUM(current_stock * cost_price), 0) AS total
      FROM parts
      WHERE status = 'active'
    `);

    const inventorySale = await db.get(`
      SELECT COALESCE(SUM(current_stock * sale_price), 0) AS total
      FROM parts
      WHERE status = 'active'
    `);

    return {
      totalParts: totalParts.total || 0,
      totalUnits: totalUnits.total || 0,
      lowStock: lowStock.total || 0,
      inventoryCost: inventoryCost.total || 0,
      inventorySale: inventorySale.total || 0
    };
  }

  static async findParts() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        parts.*,
        suppliers.company_name AS supplier_name
      FROM parts
      LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
      WHERE parts.status = 'active'
      ORDER BY parts.name ASC
    `);
  }

  static async findPartById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT *
      FROM parts
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async findLowStockParts() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        parts.*,
        suppliers.company_name AS supplier_name
      FROM parts
      LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
      WHERE parts.current_stock <= parts.min_stock
      AND parts.min_stock > 0
      AND parts.status = 'active'
      ORDER BY parts.current_stock ASC
    `);
  }

  static async findMovements() {
    const db = await connectDatabase();

    return db.all(`
      SELECT
        inventory_movements.*,
        parts.name AS part_name,
        parts.sku AS part_sku,
        users.name AS user_name
      FROM inventory_movements
      LEFT JOIN parts ON parts.id = inventory_movements.part_id
      LEFT JOIN users ON users.id = inventory_movements.user_id
      ORDER BY inventory_movements.created_at DESC
      LIMIT 300
    `);
  }

  static async createEntry(data) {
    const db = await connectDatabase();

    const quantity = Number(data.quantity);

    if (!quantity || quantity <= 0) {
      throw new Error('A quantidade de entrada precisa ser maior que zero.');
    }

    const part = await this.findPartById(data.part_id);

    if (!part) {
      throw new Error('Peça não encontrada.');
    }

    try {
      await db.exec('BEGIN TRANSACTION');

      await db.run(
        `
        UPDATE parts
        SET
          current_stock = current_stock + ?,
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
          'entry',
          quantity,
          data.unit_cost || 0,
          part.sale_price || 0,
          data.reason || 'Entrada de estoque',
          data.reference_type || null,
          data.reference_id || null
        ]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async createExit(data) {
    const db = await connectDatabase();

    const quantity = Number(data.quantity);

    if (!quantity || quantity <= 0) {
      throw new Error('A quantidade de saída precisa ser maior que zero.');
    }

    const part = await this.findPartById(data.part_id);

    if (!part) {
      throw new Error('Peça não encontrada.');
    }

    if (Number(part.current_stock) < quantity) {
      throw new Error('Estoque insuficiente para realizar essa saída.');
    }

    try {
      await db.exec('BEGIN TRANSACTION');

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
          data.unit_price || part.sale_price || 0,
          data.reason || 'Saída de estoque',
          data.reference_type || null,
          data.reference_id || null
        ]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async createAdjustment(data) {
    const db = await connectDatabase();

    const newStock = Number(data.new_stock);

    if (newStock < 0 || Number.isNaN(newStock)) {
      throw new Error('O novo estoque não pode ser negativo.');
    }

    const part = await this.findPartById(data.part_id);

    if (!part) {
      throw new Error('Peça não encontrada.');
    }

    const currentStock = Number(part.current_stock || 0);
    const difference = newStock - currentStock;

    try {
      await db.exec('BEGIN TRANSACTION');

      await db.run(
        `
        UPDATE parts
        SET
          current_stock = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [newStock, data.part_id]
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
          'adjustment',
          difference,
          part.cost_price || 0,
          part.sale_price || 0,
          data.reason || 'Ajuste manual de estoque',
          data.reference_type || null,
          data.reference_id || null
        ]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }
}

module.exports = InventoryModel;
