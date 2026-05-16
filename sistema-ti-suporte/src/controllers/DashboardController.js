const connectDatabase = require('../database/connection');

async function getNumber(db, sql, params = []) {
  try {
    const result = await db.get(sql, params);
    return Number(result?.total || 0);
  } catch (error) {
    console.error('Erro em getNumber:', error.message);
    return 0;
  }
}

async function safeAll(db, sql, params = []) {
  try {
    return await db.all(sql, params);
  } catch (error) {
    console.error('Erro em consulta do dashboard:', error.message);
    return [];
  }
}

function getLastMonths(total = 6) {
  const months = [];
  const now = new Date();

  for (let i = total - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`
    });
  }

  return months;
}

function mapMonthlyData(months, rows) {
  rows = Array.isArray(rows) ? rows : [];

  return months.map((month) => {
    const row = rows.find((item) => item.month === month.key);
    return Number(row?.total || 0);
  });
}

function mapStatusData(rows, labelsMap = {}) {
  rows = Array.isArray(rows) ? rows : [];

  return {
    labels: rows.map((item) => labelsMap[item.status] || item.status || 'Sem status'),
    values: rows.map((item) => Number(item.total || 0))
  };
}

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

class DashboardController {
  static async index(req, res) {
    try {
      const db = await connectDatabase();
      const currentUser = req.session.user;
      const role = currentUser?.role || 'client';
      const months = getLastMonths(6);
      const startMonth = months[0].key;

      if (role === 'client') {
        const clientInfo = await db.get(
          `
          SELECT *
          FROM clients
          WHERE user_id = ?
          OR lower(email) = lower(?)
          LIMIT 1
          `,
          [
            currentUser.id,
            currentUser.email || ''
          ]
        );

        const clientId = clientInfo?.id || 0;

        const stats = {
          devices: await getNumber(db, `SELECT COUNT(*) AS total FROM devices WHERE client_id = ?`, [clientId]),

          repairsOpen: await getNumber(db, `
            SELECT COUNT(*) AS total
            FROM repairs
            INNER JOIN devices ON devices.id = repairs.device_id
            WHERE devices.client_id = ?
            AND repairs.status IN ('open', 'in_progress', 'waiting_parts')
          `, [clientId]),

          repairsFinished: await getNumber(db, `
            SELECT COUNT(*) AS total
            FROM repairs
            INNER JOIN devices ON devices.id = repairs.device_id
            WHERE devices.client_id = ?
            AND repairs.status = 'finished'
          `, [clientId]),

          deliveries: await getNumber(db, `SELECT COUNT(*) AS total FROM deliveries WHERE client_id = ?`, [clientId])
        };

        const devices = await safeAll(db, `
          SELECT *
          FROM devices
          WHERE client_id = ?
          ORDER BY created_at DESC
        `, [clientId]);

        const repairs = await safeAll(db, `
          SELECT
            repairs.*,
            devices.device_type,
            devices.brand,
            devices.model,
            devices.serial_number,
            devices.problem_description,
            users.name AS technician_name
          FROM repairs
          INNER JOIN devices ON devices.id = repairs.device_id
          LEFT JOIN users ON users.id = repairs.technician_id
          WHERE devices.client_id = ?
          ORDER BY repairs.created_at DESC
        `, [clientId]);

        const deliveries = await safeAll(db, `
          SELECT
            deliveries.*,
            devices.device_type,
            devices.brand,
            devices.model,
            devices.serial_number
          FROM deliveries
          INNER JOIN devices ON devices.id = deliveries.device_id
          WHERE deliveries.client_id = ?
          ORDER BY deliveries.delivery_date DESC
        `, [clientId]);

        return res.render('pages/dashboard/client', {
          title: 'Minha Área',
          clientInfo,
          stats,
          devices,
          repairs,
          deliveries,
          deviceStatusLabels,
          repairStatusLabels,
          statusClasses
        });
      }

      if (role === 'standard') {
        const stats = {
          clients: await getNumber(db, `SELECT COUNT(*) AS total FROM clients`),
          devices: await getNumber(db, `SELECT COUNT(*) AS total FROM devices`),
          devicesReceived: await getNumber(db, `SELECT COUNT(*) AS total FROM devices WHERE status = 'received'`),
          devicesRepairing: await getNumber(db, `SELECT COUNT(*) AS total FROM devices WHERE status IN ('diagnosis', 'repairing', 'waiting_parts')`),
          devicesRepaired: await getNumber(db, `SELECT COUNT(*) AS total FROM devices WHERE status = 'repaired'`),

          repairsOpen: await getNumber(db, `
            SELECT COUNT(*) AS total
            FROM repairs
            WHERE status IN ('open', 'in_progress', 'waiting_parts')
            AND (technician_id = ? OR technician_id IS NULL)
          `, [currentUser.id]),

          repairsFinished: await getNumber(db, `
            SELECT COUNT(*) AS total
            FROM repairs
            WHERE status = 'finished'
            AND (technician_id = ? OR technician_id IS NULL)
          `, [currentUser.id]),

          stockUnits: await getNumber(db, `
            SELECT COALESCE(SUM(current_stock), 0) AS total
            FROM parts
            WHERE status = 'active'
          `),

          lowStock: await getNumber(db, `
            SELECT COUNT(*) AS total
            FROM parts
            WHERE current_stock <= min_stock
            AND min_stock > 0
            AND status = 'active'
          `),

          waitingDelivery: await getNumber(db, `
            SELECT COUNT(*) AS total
            FROM devices
            LEFT JOIN deliveries ON deliveries.device_id = devices.id
            WHERE devices.status = 'repaired'
            AND deliveries.id IS NULL
          `)
        };

        const latestDevices = await safeAll(db, `
          SELECT devices.*, clients.name AS client_name, clients.phone AS client_phone
          FROM devices
          INNER JOIN clients ON clients.id = devices.client_id
          ORDER BY devices.created_at DESC
          LIMIT 8
        `);

        const latestRepairs = await safeAll(db, `
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
          WHERE repairs.technician_id = ?
          OR repairs.technician_id IS NULL
          ORDER BY repairs.created_at DESC
          LIMIT 8
        `, [currentUser.id]);

        const lowStockParts = await safeAll(db, `
          SELECT parts.*, suppliers.company_name AS supplier_name
          FROM parts
          LEFT JOIN suppliers ON suppliers.id = parts.supplier_id
          WHERE parts.current_stock <= parts.min_stock
          AND parts.min_stock > 0
          AND parts.status = 'active'
          ORDER BY parts.current_stock ASC
          LIMIT 8
        `);

        const waitingDeliveryDevices = await safeAll(db, `
          SELECT devices.*, clients.name AS client_name
          FROM devices
          INNER JOIN clients ON clients.id = devices.client_id
          LEFT JOIN deliveries ON deliveries.device_id = devices.id
          WHERE devices.status = 'repaired'
          AND deliveries.id IS NULL
          ORDER BY devices.updated_at DESC
          LIMIT 8
        `);

        const monthlyDevices = await safeAll(db, `
          SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS total
          FROM devices
          WHERE strftime('%Y-%m', created_at) >= ?
          GROUP BY strftime('%Y-%m', created_at)
          ORDER BY month ASC
        `, [startMonth]);

        const monthlyRepairsOpened = await safeAll(db, `
          SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS total
          FROM repairs
          WHERE strftime('%Y-%m', created_at) >= ?
          AND (technician_id = ? OR technician_id IS NULL)
          GROUP BY strftime('%Y-%m', created_at)
          ORDER BY month ASC
        `, [startMonth, currentUser.id]);

        const monthlyRepairsFinished = await safeAll(db, `
          SELECT strftime('%Y-%m', finished_at) AS month, COUNT(*) AS total
          FROM repairs
          WHERE status = 'finished'
          AND finished_at IS NOT NULL
          AND strftime('%Y-%m', finished_at) >= ?
          AND (technician_id = ? OR technician_id IS NULL)
          GROUP BY strftime('%Y-%m', finished_at)
          ORDER BY month ASC
        `, [startMonth, currentUser.id]);

        const deviceStatusRows = await safeAll(db, `
          SELECT status, COUNT(*) AS total
          FROM devices
          GROUP BY status
          ORDER BY total DESC
        `);

        const repairStatusRows = await safeAll(db, `
          SELECT status, COUNT(*) AS total
          FROM repairs
          WHERE technician_id = ?
          OR technician_id IS NULL
          GROUP BY status
          ORDER BY total DESC
        `, [currentUser.id]);

        const dashboardCharts = {
          labels: months.map((month) => month.label),
          financeEvolution: { income: [], expense: [] },
          salesEvolution: { quantity: [], value: [] },
          devicesEvolution: { devices: mapMonthlyData(months, monthlyDevices) },
          repairsEvolution: {
            opened: mapMonthlyData(months, monthlyRepairsOpened),
            finished: mapMonthlyData(months, monthlyRepairsFinished)
          },
          deviceStatus: mapStatusData(deviceStatusRows, deviceStatusLabels),
          repairStatus: mapStatusData(repairStatusRows, repairStatusLabels),
          saleStatus: { labels: [], values: [] }
        };

        return res.render('pages/dashboard/technician', {
          title: 'Painel Técnico',
          stats,
          latestDevices,
          latestRepairs,
          lowStockParts,
          waitingDeliveryDevices,
          deviceStatusLabels,
          repairStatusLabels,
          statusClasses,
          dashboardCharts
        });
      }

      const stats = {
        clients: await getNumber(db, `SELECT COUNT(*) AS total FROM clients`),
        devices: await getNumber(db, `SELECT COUNT(*) AS total FROM devices`),
        repairsOpen: await getNumber(db, `SELECT COUNT(*) AS total FROM repairs WHERE status IN ('open', 'in_progress', 'waiting_parts')`),
        repairsFinished: await getNumber(db, `SELECT COUNT(*) AS total FROM repairs WHERE status = 'finished'`),
        stockUnits: await getNumber(db, `SELECT COALESCE(SUM(current_stock), 0) AS total FROM parts WHERE status = 'active'`),
        lowStock: await getNumber(db, `
          SELECT COUNT(*) AS total
          FROM parts
          WHERE current_stock <= min_stock
          AND min_stock > 0
          AND status = 'active'
        `),
        salesPaid: await getNumber(db, `SELECT COUNT(*) AS total FROM sales WHERE status = 'paid'`),
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
        `)
      };

      stats.monthBalance = stats.incomeMonth - stats.expenseMonth;

      const latestDevices = await safeAll(db, `
        SELECT devices.*, clients.name AS client_name, clients.phone AS client_phone
        FROM devices
        INNER JOIN clients ON clients.id = devices.client_id
        ORDER BY devices.created_at DESC
        LIMIT 8
      `);

      const latestRepairs = await safeAll(db, `
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
        LIMIT 8
      `);

      const latestSales = await safeAll(db, `
        SELECT sales.*, clients.name AS client_name
        FROM sales
        LEFT JOIN clients ON clients.id = sales.client_id
        ORDER BY sales.created_at DESC
        LIMIT 8
      `);

      const latestTransactions = await safeAll(db, `
        SELECT *
        FROM financial_transactions
        ORDER BY created_at DESC
        LIMIT 8
      `);

      const monthlyIncome = await safeAll(db, `
        SELECT strftime('%Y-%m', paid_at) AS month, COALESCE(SUM(amount), 0) AS total
        FROM financial_transactions
        WHERE type = 'income'
        AND status = 'paid'
        AND paid_at IS NOT NULL
        AND strftime('%Y-%m', paid_at) >= ?
        GROUP BY strftime('%Y-%m', paid_at)
        ORDER BY month ASC
      `, [startMonth]);

      const monthlyExpense = await safeAll(db, `
        SELECT strftime('%Y-%m', paid_at) AS month, COALESCE(SUM(amount), 0) AS total
        FROM financial_transactions
        WHERE type = 'expense'
        AND status = 'paid'
        AND paid_at IS NOT NULL
        AND strftime('%Y-%m', paid_at) >= ?
        GROUP BY strftime('%Y-%m', paid_at)
        ORDER BY month ASC
      `, [startMonth]);

      const monthlySales = await safeAll(db, `
        SELECT strftime('%Y-%m', COALESCE(sold_at, created_at)) AS month, COUNT(*) AS total
        FROM sales
        WHERE status = 'paid'
        AND strftime('%Y-%m', COALESCE(sold_at, created_at)) >= ?
        GROUP BY strftime('%Y-%m', COALESCE(sold_at, created_at))
        ORDER BY month ASC
      `, [startMonth]);

      const monthlySalesValue = await safeAll(db, `
        SELECT strftime('%Y-%m', COALESCE(sold_at, created_at)) AS month, COALESCE(SUM(total_amount), 0) AS total
        FROM sales
        WHERE status = 'paid'
        AND strftime('%Y-%m', COALESCE(sold_at, created_at)) >= ?
        GROUP BY strftime('%Y-%m', COALESCE(sold_at, created_at))
        ORDER BY month ASC
      `, [startMonth]);

      const monthlyDevices = await safeAll(db, `
        SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS total
        FROM devices
        WHERE strftime('%Y-%m', created_at) >= ?
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
      `, [startMonth]);

      const monthlyRepairsOpened = await safeAll(db, `
        SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS total
        FROM repairs
        WHERE strftime('%Y-%m', created_at) >= ?
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
      `, [startMonth]);

      const monthlyRepairsFinished = await safeAll(db, `
        SELECT strftime('%Y-%m', finished_at) AS month, COUNT(*) AS total
        FROM repairs
        WHERE status = 'finished'
        AND finished_at IS NOT NULL
        AND strftime('%Y-%m', finished_at) >= ?
        GROUP BY strftime('%Y-%m', finished_at)
        ORDER BY month ASC
      `, [startMonth]);

      const deviceStatusRows = await safeAll(db, `SELECT status, COUNT(*) AS total FROM devices GROUP BY status ORDER BY total DESC`);
      const repairStatusRows = await safeAll(db, `SELECT status, COUNT(*) AS total FROM repairs GROUP BY status ORDER BY total DESC`);
      const saleStatusRows = await safeAll(db, `SELECT status, COUNT(*) AS total FROM sales GROUP BY status ORDER BY total DESC`);

      const dashboardCharts = {
        labels: months.map((month) => month.label),
        financeEvolution: {
          income: mapMonthlyData(months, monthlyIncome),
          expense: mapMonthlyData(months, monthlyExpense)
        },
        salesEvolution: {
          quantity: mapMonthlyData(months, monthlySales),
          value: mapMonthlyData(months, monthlySalesValue)
        },
        devicesEvolution: {
          devices: mapMonthlyData(months, monthlyDevices)
        },
        repairsEvolution: {
          opened: mapMonthlyData(months, monthlyRepairsOpened),
          finished: mapMonthlyData(months, monthlyRepairsFinished)
        },
        deviceStatus: mapStatusData(deviceStatusRows, deviceStatusLabels),
        repairStatus: mapStatusData(repairStatusRows, repairStatusLabels),
        saleStatus: mapStatusData(saleStatusRows, saleStatusLabels)
      };

      return res.render('pages/dashboard/admin', {
        title: 'Dashboard',
        stats,
        latestDevices,
        latestRepairs,
        latestSales,
        latestTransactions,
        deviceStatusLabels,
        repairStatusLabels,
        saleStatusLabels,
        statusClasses,
        dashboardCharts
      });
    } catch (error) {
      console.error('ERRO GERAL NO DASHBOARD:', error);
      req.flash('error', 'Erro ao carregar dashboard.');
      return res.redirect('/login');
    }
  }
}

module.exports = DashboardController;
