const connectDatabase = require('../database/connection');

class FinanceModel {
  static async getStats() {
    const db = await connectDatabase();

    const paidIncome = await db.get(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM financial_transactions
      WHERE type = 'income'
      AND status = 'paid'
    `);

    const paidExpense = await db.get(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM financial_transactions
      WHERE type = 'expense'
      AND status = 'paid'
    `);

    const pendingIncome = await db.get(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM financial_transactions
      WHERE type = 'income'
      AND status = 'pending'
    `);

    const pendingExpense = await db.get(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM financial_transactions
      WHERE type = 'expense'
      AND status = 'pending'
    `);

    const totalTransactions = await db.get(`
      SELECT COUNT(*) AS total
      FROM financial_transactions
    `);

    return {
      paidIncome: Number(paidIncome.total || 0),
      paidExpense: Number(paidExpense.total || 0),
      balance: Number(paidIncome.total || 0) - Number(paidExpense.total || 0),
      pendingIncome: Number(pendingIncome.total || 0),
      pendingExpense: Number(pendingExpense.total || 0),
      totalTransactions: Number(totalTransactions.total || 0)
    };
  }

  static async findAll() {
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

  static async findRecent(limit = 10) {
    const db = await connectDatabase();

    return db.all(
      `
      SELECT
        financial_transactions.*,
        users.name AS user_name
      FROM financial_transactions
      LEFT JOIN users ON users.id = financial_transactions.user_id
      ORDER BY financial_transactions.created_at DESC
      LIMIT ?
      `,
      [limit]
    );
  }

  static async findById(id) {
    const db = await connectDatabase();

    return db.get(
      `
      SELECT
        financial_transactions.*,
        users.name AS user_name
      FROM financial_transactions
      LEFT JOIN users ON users.id = financial_transactions.user_id
      WHERE financial_transactions.id = ?
      LIMIT 1
      `,
      [id]
    );
  }

  static async create(data) {
    const db = await connectDatabase();

    const result = await db.run(
      `
      INSERT INTO financial_transactions (
        user_id,
        type,
        category,
        description,
        amount,
        due_date,
        paid_at,
        status,
        payment_method,
        reference_type,
        reference_id
      ) VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 'paid' THEN COALESCE(?, CURRENT_TIMESTAMP) ELSE NULL END, ?, ?, ?, ?)
      `,
      [
        data.user_id || null,
        data.type,
        data.category,
        data.description,
        Number(data.amount || 0),
        data.due_date || null,
        data.status || 'pending',
        data.paid_at || null,
        data.status || 'pending',
        data.payment_method || null,
        data.reference_type || null,
        data.reference_id || null
      ]
    );

    return result.lastID;
  }

  static async update(id, data) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE financial_transactions
      SET
        type = ?,
        category = ?,
        description = ?,
        amount = ?,
        due_date = ?,
        paid_at = CASE
          WHEN ? = 'paid' THEN COALESCE(?, paid_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END,
        status = ?,
        payment_method = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        data.type,
        data.category,
        data.description,
        Number(data.amount || 0),
        data.due_date || null,
        data.status || 'pending',
        data.paid_at || null,
        data.status || 'pending',
        data.payment_method || null,
        id
      ]
    );
  }

  static async updateStatus(id, status) {
    const db = await connectDatabase();

    await db.run(
      `
      UPDATE financial_transactions
      SET
        status = ?,
        paid_at = CASE
          WHEN ? = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, status, id]
    );
  }

  static async syncSaleTransaction(saleId) {
    const db = await connectDatabase();

    const sale = await db.get(
      `
      SELECT
        sales.*,
        clients.name AS client_name
      FROM sales
      LEFT JOIN clients ON clients.id = sales.client_id
      WHERE sales.id = ?
      LIMIT 1
      `,
      [saleId]
    );

    if (!sale) {
      return;
    }

    const existing = await db.get(
      `
      SELECT *
      FROM financial_transactions
      WHERE reference_type = 'sale'
      AND reference_id = ?
      LIMIT 1
      `,
      [saleId]
    );

    const amount = Number(sale.total_amount || 0);
    const description = `Recebimento da venda #${sale.id}${sale.client_name ? ' - ' + sale.client_name : ''}`;
    const status = sale.status === 'paid'
      ? 'paid'
      : sale.status === 'cancelled'
        ? 'cancelled'
        : 'pending';

    if (existing) {
      await db.run(
        `
        UPDATE financial_transactions
        SET
          user_id = ?,
          type = 'income',
          category = 'Venda',
          description = ?,
          amount = ?,
          status = ?,
          payment_method = ?,
          paid_at = CASE
            WHEN ? = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP)
            ELSE NULL
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          sale.user_id || null,
          description,
          amount,
          status,
          sale.payment_method || null,
          status,
          existing.id
        ]
      );

      return;
    }

    if (sale.status === 'paid' && amount > 0) {
      await db.run(
        `
        INSERT INTO financial_transactions (
          user_id,
          type,
          category,
          description,
          amount,
          due_date,
          paid_at,
          status,
          payment_method,
          reference_type,
          reference_id
        ) VALUES (?, 'income', 'Venda', ?, ?, DATE('now'), CURRENT_TIMESTAMP, 'paid', ?, 'sale', ?)
        `,
        [
          sale.user_id || null,
          description,
          amount,
          sale.payment_method || null,
          sale.id
        ]
      );
    }
  }
}

module.exports = FinanceModel;
