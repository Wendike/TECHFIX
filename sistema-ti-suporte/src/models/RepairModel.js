const connectDatabase = require('../database/connection');

function deviceStatusFromRepairStatus(status) {
  const map = {
    open: 'diagnosis',
    in_progress: 'repairing',
    waiting_parts: 'waiting_parts',
    finished: 'repaired',
    cancelled: 'cancelled'
  };

  return map[status] || 'diagnosis';
}

class RepairModel {
  static async getCalculatedPartsCost(db, repairId) {
    const result = await db.get(
      `
      SELECT COALESCE(SUM(total_price), 0) AS total
      FROM repair_parts
      WHERE repair_id = ?
      `,
      [repairId]
    );

    return Number(result.total || 0);
  }

  static async updateRepairTotals(db, repairId) {
    const repair = await db.get(
      `
      SELECT labor_cost
      FROM repairs
      WHERE id = ?
      LIMIT 1
      `,
      [repairId]
    );

    const partsCost = await this.getCalculatedPartsCost(db, repairId);
    const laborCost = Number(repair?.labor_cost || 0);
    const totalCost = laborCost + partsCost;

    await db.run(
      `
      UPDATE repairs
      SET
        parts_cost = ?,
        total_cost = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [partsCost, totalCost, repairId]
    );
  }

  static async create(data) {
    const db = await connectDatabase();

    const laborCost = Number(data.labor_cost || 0);
    const partsCost = Number(data.parts_cost || 0);
    const totalCost = laborCost + partsCost;
    const status = data.status || 'open';

    try {
      await db.exec('BEGIN TRANSACTION');

      const result = await db.run(
        `
        INSERT INTO repairs (
          device_id,
          technician_id,
          diagnosis,
          solution,
          labor_cost,
          parts_cost,
          total_cost,
          status,
          started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          data.device_id,
          data.technician_id || null,
          data.diagnosis || null,
          data.solution || null,
          laborCost,
          partsCost,
          totalCost,
          status
        ]
      );

      await db.run(
        `
        UPDATE devices
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [deviceStatusFromRepairStatus(status), data.device_id]
      );

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
        repairs.*,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number,
        devices.problem_description,
        devices.status AS device_status,
        clients.name AS client_name,
        clients.phone AS client_phone,
        technicians.name AS technician_name
      FROM repairs
      INNER JOIN devices ON devices.id = repairs.device_id
      INNER JOIN clients ON clients.id = devices.client_id
      LEFT JOIN users AS technicians ON technicians.id = repairs.technician_id
      ORDER BY repairs.created_at DESC
      `
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        repairs.*,
        devices.device_type,
        devices.brand,
        devices.model,
        devices.serial_number,
        devices.problem_description,
        devices.accessories,
        devices.password_or_pin,
        devices.physical_condition,
        devices.status AS device_status,
        devices.received_at,
        clients.name AS client_name,
        clients.email AS client_email,
        clients.phone AS client_phone,
        clients.document AS client_document,
        technicians.name AS technician_name,
        technicians.email AS technician_email
      FROM repairs
      INNER JOIN devices ON devices.id = repairs.device_id
      INNER JOIN clients ON clients.id = devices.client_id
      LEFT JOIN users AS technicians ON technicians.id = repairs.technician_id
      WHERE repairs.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async update(id, data) {
    const db = await connectDatabase();

    const laborCost = Number(data.labor_cost || 0);
    const manualPartsCost = Number(data.parts_cost || 0);
    const status = data.status || 'open';

    try {
      await db.exec('BEGIN TRANSACTION');

      const repair = await this.findById(id);

      if (!repair) {
        throw new Error('Reparo não encontrado.');
      }

      const calculatedPartsCost = await this.getCalculatedPartsCost(db, id);
      const finalPartsCost = calculatedPartsCost > 0 ? calculatedPartsCost : manualPartsCost;
      const totalCost = laborCost + finalPartsCost;

      await db.run(
        `
        UPDATE repairs
        SET
          device_id = ?,
          technician_id = ?,
          diagnosis = ?,
          solution = ?,
          labor_cost = ?,
          parts_cost = ?,
          total_cost = ?,
          status = ?,
          finished_at = CASE
            WHEN ? = 'finished' AND finished_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE finished_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          data.device_id,
          data.technician_id || null,
          data.diagnosis || null,
          data.solution || null,
          laborCost,
          finalPartsCost,
          totalCost,
          status,
          status,
          id
        ]
      );

      await db.run(
        `
        UPDATE devices
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [deviceStatusFromRepairStatus(status), data.device_id]
      );

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

      const repair = await this.findById(id);

      if (!repair) {
        throw new Error('Reparo não encontrado.');
      }

      await db.run(
        `
        UPDATE repairs
        SET
          status = ?,
          finished_at = CASE
            WHEN ? = 'finished' AND finished_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE finished_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [status, status, id]
      );

      await db.run(
        `
        UPDATE devices
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [deviceStatusFromRepairStatus(status), repair.device_id]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async finish(id, data) {
    const db = await connectDatabase();

    const laborCost = Number(data.labor_cost || 0);

    try {
      await db.exec('BEGIN TRANSACTION');

      const repair = await this.findById(id);

      if (!repair) {
        throw new Error('Reparo não encontrado.');
      }

      const calculatedPartsCost = await this.getCalculatedPartsCost(db, id);
      const manualPartsCost = Number(data.parts_cost || 0);
      const finalPartsCost = calculatedPartsCost > 0 ? calculatedPartsCost : manualPartsCost;
      const totalCost = laborCost + finalPartsCost;

      await db.run(
        `
        UPDATE repairs
        SET
          solution = ?,
          labor_cost = ?,
          parts_cost = ?,
          total_cost = ?,
          status = 'finished',
          finished_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          data.solution || null,
          laborCost,
          finalPartsCost,
          totalCost,
          id
        ]
      );

      await db.run(
        `
        UPDATE devices
        SET
          status = 'repaired',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [repair.device_id]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async findDevices() {
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
        clients.name AS client_name
      FROM devices
      INNER JOIN clients ON clients.id = devices.client_id
      WHERE devices.status NOT IN ('delivered', 'cancelled')
      ORDER BY devices.created_at DESC
      `
    );
  }

  static async findTechnicians() {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT id, name, email, role
      FROM users
      WHERE status = 'active'
      AND role IN ('admin', 'standard')
      ORDER BY name ASC
      `
    );
  }

  static async findAvailableParts() {
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

  static async findUsedParts(repairId) {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        repair_parts.id,
        repair_parts.repair_id,
        repair_parts.part_id,
        repair_parts.quantity,
        repair_parts.unit_cost,
        repair_parts.unit_price,
        repair_parts.total_price,
        repair_parts.created_at,
        parts.name AS part_name,
        parts.sku AS part_sku,
        parts.current_stock,
        parts.location
      FROM repair_parts
      INNER JOIN parts ON parts.id = repair_parts.part_id
      WHERE repair_parts.repair_id = ?
      ORDER BY repair_parts.created_at DESC
      `,
      [repairId]
    );
  }

  static async addPartToRepair(repairId, data) {
    const db = await connectDatabase();

    const quantity = Number(data.quantity || 0);

    if (!quantity || quantity <= 0) {
      throw new Error('A quantidade precisa ser maior que zero.');
    }

    try {
      await db.exec('BEGIN TRANSACTION');

      const repair = await this.findById(repairId);

      if (!repair) {
        throw new Error('Reparo não encontrado.');
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
        throw new Error('Estoque insuficiente para usar essa peça no reparo.');
      }

      const unitCost = Number(part.cost_price || 0);
      const unitPrice = Number(data.unit_price || part.sale_price || 0);
      const totalPrice = unitPrice * quantity;

      await db.run(
        `
        INSERT INTO repair_parts (
          repair_id,
          part_id,
          quantity,
          unit_cost,
          unit_price,
          total_price
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          repairId,
          data.part_id,
          quantity,
          unitCost,
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
          unitCost,
          unitPrice,
          data.reason || `Uso da peça no reparo #${repairId}`,
          'repair',
          repairId
        ]
      );

      await this.updateRepairTotals(db, repairId);

      await db.run(
        `
        UPDATE repairs
        SET
          status = CASE
            WHEN status = 'open' THEN 'in_progress'
            ELSE status
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [repairId]
      );

      await db.run(
        `
        UPDATE devices
        SET
          status = 'repairing',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [repair.device_id]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async removePartFromRepair(repairId, repairPartId, userId) {
    const db = await connectDatabase();

    try {
      await db.exec('BEGIN TRANSACTION');

      const usedPart = await db.get(
        `
        SELECT
          repair_parts.*,
          parts.name AS part_name
        FROM repair_parts
        INNER JOIN parts ON parts.id = repair_parts.part_id
        WHERE repair_parts.id = ?
        AND repair_parts.repair_id = ?
        LIMIT 1
        `,
        [repairPartId, repairId]
      );

      if (!usedPart) {
        throw new Error('Peça usada no reparo não encontrada.');
      }

      await db.run(
        `
        UPDATE parts
        SET
          current_stock = current_stock + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [usedPart.quantity, usedPart.part_id]
      );

      await db.run(
        `
        DELETE FROM repair_parts
        WHERE id = ?
        AND repair_id = ?
        `,
        [repairPartId, repairId]
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
          usedPart.part_id,
          userId || null,
          'return',
          usedPart.quantity,
          usedPart.unit_cost || 0,
          usedPart.unit_price || 0,
          `Remoção/devolução da peça no reparo #${repairId}`,
          'repair',
          repairId
        ]
      );

      await this.updateRepairTotals(db, repairId);

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  static async count() {
    const db = await connectDatabase();
    const result = await db.get('SELECT COUNT(*) AS total FROM repairs');
    return result.total || 0;
  }
}

module.exports = RepairModel;
