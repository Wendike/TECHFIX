const FinanceModel = require('../models/FinanceModel');

const typeOptions = [
  { value: 'income', label: 'Receita / Entrada' },
  { value: 'expense', label: 'Despesa / Saída' }
];

const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'cancelled', label: 'Cancelado' }
];

const typeLabels = {
  income: 'Receita',
  expense: 'Despesa'
};

const statusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado'
};

const typeClasses = {
  income: 'badge-success',
  expense: 'badge-danger'
};

const statusClasses = {
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

class FinanceController {
  static async index(req, res) {
    try {
      const stats = await FinanceModel.getStats();
      const transactions = await FinanceModel.findRecent(10);

      return res.render('pages/finance/index', {
        title: 'Financeiro',
        stats,
        transactions,
        typeLabels,
        statusLabels,
        typeClasses,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar financeiro.');
      return res.redirect('/');
    }
  }

  static async transactions(req, res) {
    try {
      const transactions = await FinanceModel.findAll();

      return res.render('pages/finance/transactions', {
        title: 'Transações Financeiras',
        transactions,
        typeLabels,
        statusLabels,
        typeClasses,
        statusClasses,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar transações.');
      return res.redirect('/finance');
    }
  }

  static create(req, res) {
    return res.render('pages/finance/create-transaction', {
      title: 'Nova Transação',
      typeOptions,
      statusOptions
    });
  }

  static async store(req, res) {
    try {
      const {
        type,
        category,
        description,
        amount,
        due_date,
        paid_at,
        status,
        payment_method
      } = req.body;

      if (!type || !category || !description || !amount) {
        req.flash('error', 'Tipo, categoria, descrição e valor são obrigatórios.');
        return res.redirect('/finance/create');
      }

      await FinanceModel.create({
        user_id: req.session.user.id,
        type,
        category,
        description,
        amount: parseMoney(amount),
        due_date,
        paid_at,
        status,
        payment_method
      });

      req.flash('success', 'Transação financeira cadastrada com sucesso.');
      return res.redirect('/finance/transactions');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao cadastrar transação financeira.');
      return res.redirect('/finance/create');
    }
  }

  static async show(req, res) {
    try {
      const transaction = await FinanceModel.findById(req.params.id);

      if (!transaction) {
        req.flash('error', 'Transação não encontrada.');
        return res.redirect('/finance/transactions');
      }

      return res.render('pages/finance/show', {
        title: 'Detalhes da Transação',
        transaction,
        typeLabels,
        statusLabels,
        typeClasses,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar transação.');
      return res.redirect('/finance/transactions');
    }
  }

  static async edit(req, res) {
    try {
      const transaction = await FinanceModel.findById(req.params.id);

      if (!transaction) {
        req.flash('error', 'Transação não encontrada.');
        return res.redirect('/finance/transactions');
      }

      return res.render('pages/finance/edit', {
        title: 'Editar Transação',
        transaction,
        typeOptions,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição da transação.');
      return res.redirect('/finance/transactions');
    }
  }

  static async update(req, res) {
    try {
      const {
        type,
        category,
        description,
        amount,
        due_date,
        paid_at,
        status,
        payment_method
      } = req.body;

      if (!type || !category || !description || !amount) {
        req.flash('error', 'Tipo, categoria, descrição e valor são obrigatórios.');
        return res.redirect(`/finance/${req.params.id}/edit`);
      }

      await FinanceModel.update(req.params.id, {
        type,
        category,
        description,
        amount: parseMoney(amount),
        due_date,
        paid_at,
        status,
        payment_method
      });

      req.flash('success', 'Transação financeira atualizada com sucesso.');
      return res.redirect('/finance/transactions');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao atualizar transação financeira.');
      return res.redirect(`/finance/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const { status } = req.body;
      const allowed = statusOptions.map((item) => item.value);

      if (!allowed.includes(status)) {
        req.flash('error', 'Status inválido.');
        return res.redirect('/finance/transactions');
      }

      await FinanceModel.updateStatus(req.params.id, status);

      req.flash('success', 'Status da transação atualizado com sucesso.');
      return res.redirect('/finance/transactions');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao alterar status da transação.');
      return res.redirect('/finance/transactions');
    }
  }
}

module.exports = FinanceController;
