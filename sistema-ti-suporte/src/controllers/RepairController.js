const RepairModel = require('../models/RepairModel');

const statusOptions = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'waiting_parts', label: 'Aguardando peças' },
  { value: 'finished', label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' }
];

const statusLabels = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  waiting_parts: 'Aguardando peças',
  finished: 'Finalizado',
  cancelled: 'Cancelado'
};

const statusClasses = {
  open: 'badge-role',
  in_progress: 'badge-warning',
  waiting_parts: 'badge-warning',
  finished: 'badge-success',
  cancelled: 'badge-danger'
};

function parseMoney(value) {
  if (!value) {
    return 0;
  }

  return Number(String(value).replace(',', '.')) || 0;
}

function parseQuantity(value) {
  return parseInt(value, 10) || 0;
}

class RepairController {
  static async index(req, res) {
    try {
      const repairs = await RepairModel.findAll();

      return res.render('pages/repairs/index', {
        title: 'Reparos',
        repairs,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar reparos.');
      return res.redirect('/');
    }
  }

  static async create(req, res) {
    try {
      const devices = await RepairModel.findDevices();
      const technicians = await RepairModel.findTechnicians();

      return res.render('pages/repairs/create', {
        title: 'Novo Reparo',
        devices,
        technicians,
        statusOptions,
        selectedDeviceId: req.query.device_id || ''
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir cadastro de reparo.');
      return res.redirect('/repairs');
    }
  }

  static async store(req, res) {
    try {
      const {
        device_id,
        technician_id,
        diagnosis,
        solution,
        labor_cost,
        parts_cost,
        status
      } = req.body;

      if (!device_id || !diagnosis) {
        req.flash('error', 'Dispositivo e diagnóstico são obrigatórios.');
        return res.redirect('/repairs/create');
      }

      await RepairModel.create({
        device_id,
        technician_id,
        diagnosis,
        solution,
        labor_cost: parseMoney(labor_cost),
        parts_cost: parseMoney(parts_cost),
        status
      });

      req.flash('success', 'Reparo aberto com sucesso.');
      return res.redirect('/repairs');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao abrir reparo.');
      return res.redirect('/repairs/create');
    }
  }

  static async show(req, res) {
    try {
      const repair = await RepairModel.findById(req.params.id);

      if (!repair) {
        req.flash('error', 'Reparo não encontrado.');
        return res.redirect('/repairs');
      }

      const availableParts = await RepairModel.findAvailableParts();
      const usedParts = await RepairModel.findUsedParts(req.params.id);

      return res.render('pages/repairs/show', {
        title: 'Detalhes do Reparo',
        repair,
        availableParts,
        usedParts,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar reparo.');
      return res.redirect('/repairs');
    }
  }

  static async edit(req, res) {
    try {
      const repair = await RepairModel.findById(req.params.id);

      if (!repair) {
        req.flash('error', 'Reparo não encontrado.');
        return res.redirect('/repairs');
      }

      const devices = await RepairModel.findDevices();
      const technicians = await RepairModel.findTechnicians();

      return res.render('pages/repairs/edit', {
        title: 'Editar Reparo',
        repair,
        devices,
        technicians,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição do reparo.');
      return res.redirect('/repairs');
    }
  }

  static async update(req, res) {
    try {
      const {
        device_id,
        technician_id,
        diagnosis,
        solution,
        labor_cost,
        parts_cost,
        status
      } = req.body;

      if (!device_id || !diagnosis) {
        req.flash('error', 'Dispositivo e diagnóstico são obrigatórios.');
        return res.redirect(`/repairs/${req.params.id}/edit`);
      }

      await RepairModel.update(req.params.id, {
        device_id,
        technician_id,
        diagnosis,
        solution,
        labor_cost: parseMoney(labor_cost),
        parts_cost: parseMoney(parts_cost),
        status
      });

      req.flash('success', 'Reparo atualizado com sucesso.');
      return res.redirect('/repairs');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao atualizar reparo.');
      return res.redirect(`/repairs/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const { status } = req.body;
      const allowedStatus = statusOptions.map((item) => item.value);

      if (!allowedStatus.includes(status)) {
        req.flash('error', 'Status inválido.');
        return res.redirect('/repairs');
      }

      await RepairModel.updateStatus(req.params.id, status);

      req.flash('success', 'Status do reparo atualizado com sucesso.');
      return res.redirect('/repairs');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao alterar status do reparo.');
      return res.redirect('/repairs');
    }
  }

  static async addPart(req, res) {
    try {
      const { part_id, quantity, unit_price, reason } = req.body;

      if (!part_id) {
        req.flash('error', 'Selecione uma peça para usar no reparo.');
        return res.redirect(`/repairs/${req.params.id}`);
      }

      await RepairModel.addPartToRepair(req.params.id, {
        part_id,
        quantity: parseQuantity(quantity),
        unit_price: parseMoney(unit_price),
        reason,
        user_id: req.session.user.id
      });

      req.flash('success', 'Peça adicionada ao reparo e estoque atualizado com sucesso.');
      return res.redirect(`/repairs/${req.params.id}`);
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao adicionar peça ao reparo.');
      return res.redirect(`/repairs/${req.params.id}`);
    }
  }

  static async removePart(req, res) {
    try {
      await RepairModel.removePartFromRepair(
        req.params.id,
        req.params.repairPartId,
        req.session.user.id
      );

      req.flash('success', 'Peça removida do reparo e devolvida ao estoque.');
      return res.redirect(`/repairs/${req.params.id}`);
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao remover peça do reparo.');
      return res.redirect(`/repairs/${req.params.id}`);
    }
  }

  static async finishForm(req, res) {
    try {
      const repair = await RepairModel.findById(req.params.id);

      if (!repair) {
        req.flash('error', 'Reparo não encontrado.');
        return res.redirect('/repairs');
      }

      return res.render('pages/repairs/finish', {
        title: 'Finalizar Reparo',
        repair,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir finalização do reparo.');
      return res.redirect('/repairs');
    }
  }

  static async finish(req, res) {
    try {
      const { solution, labor_cost, parts_cost } = req.body;

      if (!solution) {
        req.flash('error', 'Informe a solução aplicada antes de finalizar.');
        return res.redirect(`/repairs/${req.params.id}/finish`);
      }

      await RepairModel.finish(req.params.id, {
        solution,
        labor_cost: parseMoney(labor_cost),
        parts_cost: parseMoney(parts_cost)
      });

      req.flash('success', 'Reparo finalizado com sucesso. O dispositivo foi marcado como reparado.');
      return res.redirect('/repairs');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao finalizar reparo.');
      return res.redirect(`/repairs/${req.params.id}/finish`);
    }
  }
}

module.exports = RepairController;
