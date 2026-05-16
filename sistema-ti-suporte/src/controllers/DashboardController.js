const connectDatabase = require('../database/connection');

async function getNumber(db, sql, params = []) {
  const result = await db.get(sql, params);
  return Number(result?.total || 0);
}

class DashboardController {
  static async index(req, res) {
    try {
      const db = await connectDatabase();

      const stats = {
        users: await getNumber(db, `SELECT COUNT(*) AS total FROM users`),
        clients: await getNumber(db, `SELECT COUNT(*) AS total FROM clients`),
        suppliers: await getNumber(db, `SELECT COUNT(*) AS total FROM suppliers`),
        devices: await getNumber(db, `SELECT COUNT(*) AS total FROM devices`),
        devicesReceived: await getNumber(db, `SELECT COUNT(*) AS total FROM devices WHERE status = 'received'`),
        devicesDelivered: await getNumber(db, `SELECT COUNT(*) AS total FROM devices WHERE status = 'delivered'`),
        repairs: await getNumber(db, `SELECT COUNT(*) AS total FROM repairs`),
        repairsOpen: await getNumber(db, `SELECT COUNT(*) AS total FROM repairs WHERE status IN ('open', 'in_progress', 'waiting_parts')`),
        repairsFinished: await getNumber(db, `SELECT COUNT(*) AS total FROM repairs WHERE status = 'finished'`),
        parts: await getNumber(db, `SELECT COUNT(*) AS total FROM parts`),
        stockUnits: await getNumber(db, `SELECT COALESCE(SUM(current_stock), 0) AS total FROM parts WHERE status = 'active'`),
        lowStock: await getNumber(db, `
          SELECT COUNT(*) AS total
          FROM parts
          WHERE current_stock <= min_stock
          AND min_stock > 0
          AND status = 'active'
        `),
        sales: await getNumber(db, `SELECT COUNT(*) AS total FROM sales`),
        salesPaid: await getNumber(db, `SELECT COUNT(*) AS total FROM sales WHERE status = 'paid'`),
        salesPending: await getNumber(db, `SELECT COUNT(*) AS total FROM sales WHERE status = 'pending'`),
        deliveries: await getNumber(db, `SELECT COUNT(*) AS total FROM deliveries`),
        incomeMonth: await getNumber(db, `
          SELECT COALESCE(SUM(amount), 0) AS total
          FROM financial_transactions
          WHERE type = 'income'
          AND status = 'paid'
          AND date(paid_at) >= date('now', 'start of month')
        `),
        expenseMonth: await getNumber(db, `
          SELECT COALESCE(SUM(amount), 0) AS total
          FROM financial_transactions
          WHERE type = 'expense'
          AND status = 'paid'
          AND date(paid_at) >= date('now', 'start of month')
        `),
        totalBalance: await getNumber(db, `
          SELECT
            COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END), 0) AS total
          FROM financial_transactions
        `),
        pendingIncome: await getNumber(db, `
          SELECT COALESCE(SUM(amount), 0) AS total
          FROM financial_transactions
          WHERE type = 'income'
          AND status = 'pending'
        `),
        pendingExpense: await getNumber(db, `
          SELECT COALESCE(SUM(amount), 0) AS total
          FROM financial_transactions
          WHERE type = 'expense'
          AND status = 'pending'
        `)
      };

      stats.monthBalance = stats.incomeMonth - stats.expenseMonth;

      const latestDevices = await db.all(`
        SELECT
          devices.*,
          clients.name AS client_name,
          clients.phone AS client_phone
        FROM devices
        INNER JOIN clients ON clients.id = devices.client_id
        ORDER BY devices.created_at DESC
        LIMIT 5
      `);

      const latestRepairs = await db.all(`
        SELECT
          repairs.*,
          clients.name AS client_name,
          devices.device_type,
          devices.brand,
          devices.model,
          users.name AS technician_name
        FROM repairs
        INNER JOIN devices ON devices.id = repairs.device_id
        INNER JOIN clients ON clients.id = devices.client_id
        LEFT JOIN users ON users.id = repairs.technician_id
        ORDER BY repairs.created_at DESC
        LIMIT 5
      `);

      const latestSales = await db.all(`
        SELECT
          sales.*,
          clients.name AS client_name
        FROM sales
        LEFT JOIN clients ON clients.id = sales.client_id
        ORDER BY sales.created_at DESC
        LIMIT 5
      `);

      const lowStockParts = await db.all(`
        SELECT
          parts.*,
          suppliers.company_name AS supplier_name
        FROM parts
        LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
        WHERE parts.current_stock <= parts.min_stock
        AND parts.min_stock > 0
        AND parts.status = 'active'
        ORDER BY parts.current_stock ASC
        LIMIT 5
      `);

      const waitingDeliveryDevices = await db.all(`
        SELECT
          devices.*,
          clients.name AS client_name
        FROM devices
        INNER JOIN clients ON clients.id = devices.client_id
        LEFT JOIN deliveries ON deliveries.device_id = devices.id
        WHERE devices.status = 'repaired'
        AND deliveries.id IS NULL
        ORDER BY devices.updated_at DESC
        LIMIT 5
      `);

      const latestTransactions = await db.all(`
        SELECT *
        FROM financial_transactions
        ORDER BY created_at DESC
        LIMIT 5
      `);

      const deviceStatusLabels = {
        received: 'Recebido',
        diagnosis: 'Diagnóstico',
        waiting_approval: 'Aguardando aprovação',
        repairing: 'Em reparo',
        waiting_parts: 'Aguardando peças',
        repaired: 'Reparado',
        delivered: 'Entregue',
        cancelled: 'Cancelado'
      };

      const repairStatusLabels = {
        open: 'Aberto',
        in_progress: 'Em andamento',
        waiting_parts: 'Aguardando peças',
        finished: 'Finalizado',
        cancelled: 'Cancelado'
      };

      const saleStatusLabels = {
        draft: 'Rascunho',
        pending: 'Pendente',
        paid: 'Pago',
        cancelled: 'Cancelado'
      };

      const statusClasses = {
        received: 'badge-role',
        diagnosis: 'badge-warning',
        waiting_approval: 'badge-warning',
        repairing: 'badge-role',
        waiting_parts: 'badge-warning',
        repaired: 'badge-success',
        delivered: 'badge-success',
        cancelled: 'badge-danger',
        open: 'badge-role',
        in_progress: 'badge-warning',
        finished: 'badge-success',
        draft: 'badge-role',
        pending: 'badge-warning',
        paid: 'badge-success',
        income: 'badge-success',
        expense: 'badge-danger'
      };

      return res.render('pages/dashboard/index', {
        title: 'Dashboard',
        stats,
        latestDevices,
        latestRepairs,
        latestSales,
        lowStockParts,
        waitingDeliveryDevices,
        latestTransactions,
        deviceStatusLabels,
        repairStatusLabels,
        saleStatusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar dashboard.');
      return res.redirect('/login');
    }
  }
}

module.exports = DashboardController;
