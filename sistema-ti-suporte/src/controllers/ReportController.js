const ReportModel = require('../models/ReportModel');

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

const financeTypeLabels = {
  income: 'Receita',
  expense: 'Despesa'
};

const financeStatusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado'
};

const statusClasses = {
  active: 'badge-success',
  inactive: 'badge-danger',
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

class ReportController {
  static async index(req, res) {
    try {
      const overview = await ReportModel.getOverview();

      return res.render('pages/reports/index', {
        title: 'Relatórios',
        overview
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar relatórios.');
      return res.redirect('/');
    }
  }

  static async clients(req, res) {
    const clients = await ReportModel.clients();

    return res.render('pages/reports/clients', {
      title: 'Relatório de Clientes',
      clients,
      statusClasses
    });
  }

  static async devices(req, res) {
    const devices = await ReportModel.devices();

    return res.render('pages/reports/devices', {
      title: 'Relatório de Dispositivos',
      devices,
      deviceStatusLabels,
      statusClasses
    });
  }

  static async repairs(req, res) {
    const repairs = await ReportModel.repairs();

    return res.render('pages/reports/repairs', {
      title: 'Relatório de Reparos',
      repairs,
      repairStatusLabels,
      statusClasses
    });
  }

  static async inventory(req, res) {
    const parts = await ReportModel.inventory();

    return res.render('pages/reports/inventory', {
      title: 'Relatório de Estoque',
      parts,
      statusClasses
    });
  }

  static async sales(req, res) {
    const sales = await ReportModel.sales();

    return res.render('pages/reports/sales', {
      title: 'Relatório de Vendas',
      sales,
      saleStatusLabels,
      statusClasses
    });
  }

  static async finance(req, res) {
    const transactions = await ReportModel.finance();

    return res.render('pages/reports/finance', {
      title: 'Relatório Financeiro',
      transactions,
      financeTypeLabels,
      financeStatusLabels,
      statusClasses
    });
  }

  static async deliveries(req, res) {
    const deliveries = await ReportModel.deliveries();

    return res.render('pages/reports/deliveries', {
      title: 'Relatório de Entregas',
      deliveries,
      statusClasses
    });
  }
}

module.exports = ReportController;
