const SaleModel = require('../models/SaleModel');

const statusOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'cancelled', label: 'Cancelado' }
];

const statusLabels = {
  draft: 'Rascunho',
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado'
};

const statusClasses = {
  draft: 'badge-role',
  pending: 'badge-warning',
  paid: 'badge-success',
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

class SaleController {
  static async index(req, res) {
    try {
      const sales = await SaleModel.findAll();

      return res.render('pages/sales/index', {
        title: 'Vendas',
        sales,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar vendas.');
      return res.redirect('/');
    }
  }

  static async create(req, res) {
    try {
      const clients = await SaleModel.findClients();
      const repairs = await SaleModel.findRepairs();

      return res.render('pages/sales/create', {
        title: 'Nova Venda',
        clients,
        repairs,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir nova venda.');
      return res.redirect('/sales');
    }
  }

  static async store(req, res) {
    try {
      const {
        client_id,
        repair_id,
        discount,
        status,
        payment_method
      } = req.body;

      if (!client_id && !repair_id) {
        req.flash('error', 'Selecione um cliente ou vincule um reparo.');
        return res.redirect('/sales/create');
      }

      const saleId = await SaleModel.create({
        client_id,
        repair_id,
        discount: parseMoney(discount),
        status,
        payment_method,
        user_id: req.session.user.id
      });

      req.flash('success', 'Venda criada com sucesso. Agora você pode adicionar peças.');
      return res.redirect(`/sales/${saleId}`);
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao criar venda.');
      return res.redirect('/sales/create');
    }
  }

  static async show(req, res) {
    try {
      const sale = await SaleModel.findById(req.params.id);

      if (!sale) {
        req.flash('error', 'Venda não encontrada.');
        return res.redirect('/sales');
      }

      const items = await SaleModel.findItems(req.params.id);
      const parts = await SaleModel.findParts();

      return res.render('pages/sales/show', {
        title: 'Detalhes da Venda',
        sale,
        items,
        parts,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar venda.');
      return res.redirect('/sales');
    }
  }

  static async edit(req, res) {
    try {
      const sale = await SaleModel.findById(req.params.id);

      if (!sale) {
        req.flash('error', 'Venda não encontrada.');
        return res.redirect('/sales');
      }

      const clients = await SaleModel.findClients();
      const repairs = await SaleModel.findRepairs();

      return res.render('pages/sales/edit', {
        title: 'Editar Venda',
        sale,
        clients,
        repairs,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição da venda.');
      return res.redirect('/sales');
    }
  }

  static async update(req, res) {
    try {
      const {
        client_id,
        repair_id,
        discount,
        status,
        payment_method
      } = req.body;

      await SaleModel.update(req.params.id, {
        client_id,
        repair_id,
        discount: parseMoney(discount),
        status,
        payment_method
      });

      req.flash('success', 'Venda atualizada com sucesso.');
      return res.redirect(`/sales/${req.params.id}`);
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao atualizar venda.');
      return res.redirect(`/sales/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const { status } = req.body;
      const allowed = statusOptions.map((item) => item.value);

      if (!allowed.includes(status)) {
        req.flash('error', 'Status inválido.');
        return res.redirect('/sales');
      }

      await SaleModel.updateStatus(req.params.id, status);

      req.flash('success', 'Status da venda atualizado com sucesso.');
      return res.redirect('/sales');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao alterar status da venda.');
      return res.redirect('/sales');
    }
  }

  static async addItem(req, res) {
    try {
      const { part_id, quantity, unit_price, reason } = req.body;

      if (!part_id) {
        req.flash('error', 'Selecione uma peça.');
        return res.redirect(`/sales/${req.params.id}`);
      }

      await SaleModel.addItem(req.params.id, {
        part_id,
        quantity: parseQuantity(quantity),
        unit_price: parseMoney(unit_price),
        reason,
        user_id: req.session.user.id
      });

      req.flash('success', 'Item adicionado à venda e estoque atualizado.');
      return res.redirect(`/sales/${req.params.id}`);
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao adicionar item.');
      return res.redirect(`/sales/${req.params.id}`);
    }
  }

  static async removeItem(req, res) {
    try {
      await SaleModel.removeItem(
        req.params.id,
        req.params.itemId,
        req.session.user.id
      );

      req.flash('success', 'Item removido da venda e devolvido ao estoque.');
      return res.redirect(`/sales/${req.params.id}`);
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao remover item.');
      return res.redirect(`/sales/${req.params.id}`);
    }
  }
}

module.exports = SaleController;
