const PartModel = require('../models/PartModel');

const statuses = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' }
];

function parseMoney(value) {
  if (!value) {
    return 0;
  }

  return Number(String(value).replace(',', '.')) || 0;
}

function parseInteger(value) {
  if (!value) {
    return 0;
  }

  return parseInt(value, 10) || 0;
}

class PartController {
  static async index(req, res) {
    try {
      const parts = await PartModel.findAll();

      return res.render('pages/parts/index', {
        title: 'Peças',
        parts
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar peças.');
      return res.redirect('/');
    }
  }

  static async create(req, res) {
    try {
      const suppliers = await PartModel.findSuppliers();

      return res.render('pages/parts/create', {
        title: 'Nova Peça',
        suppliers,
        statuses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir cadastro de peça.');
      return res.redirect('/parts');
    }
  }

  static async store(req, res) {
    try {
      const {
        supplier_id,
        name,
        sku,
        category,
        description,
        cost_price,
        sale_price,
        min_stock,
        current_stock,
        location,
        status
      } = req.body;

      const cleanSku = sku ? sku.trim() : '';

      if (!name) {
        req.flash('error', 'O nome da peça é obrigatório.');
        return res.redirect('/parts/create');
      }

      if (cleanSku) {
        const skuAlreadyExists = await PartModel.skuExists(cleanSku);

        if (skuAlreadyExists) {
          req.flash('error', 'Já existe uma peça cadastrada com esse SKU/código.');
          return res.redirect('/parts/create');
        }
      }

      await PartModel.create({
        supplier_id,
        name,
        sku: cleanSku,
        category,
        description,
        cost_price: parseMoney(cost_price),
        sale_price: parseMoney(sale_price),
        min_stock: parseInteger(min_stock),
        current_stock: parseInteger(current_stock),
        location,
        status
      });

      req.flash('success', 'Peça cadastrada com sucesso.');
      return res.redirect('/parts');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao cadastrar peça.');
      return res.redirect('/parts/create');
    }
  }

  static async show(req, res) {
    try {
      const part = await PartModel.findById(req.params.id);

      if (!part) {
        req.flash('error', 'Peça não encontrada.');
        return res.redirect('/parts');
      }

      return res.render('pages/parts/show', {
        title: 'Detalhes da Peça',
        part
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar peça.');
      return res.redirect('/parts');
    }
  }

  static async edit(req, res) {
    try {
      const part = await PartModel.findById(req.params.id);

      if (!part) {
        req.flash('error', 'Peça não encontrada.');
        return res.redirect('/parts');
      }

      const suppliers = await PartModel.findSuppliers();

      return res.render('pages/parts/edit', {
        title: 'Editar Peça',
        part,
        suppliers,
        statuses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição da peça.');
      return res.redirect('/parts');
    }
  }

  static async update(req, res) {
    try {
      const {
        supplier_id,
        name,
        sku,
        category,
        description,
        cost_price,
        sale_price,
        min_stock,
        current_stock,
        location,
        status
      } = req.body;

      const part = await PartModel.findById(req.params.id);

      if (!part) {
        req.flash('error', 'Peça não encontrada.');
        return res.redirect('/parts');
      }

      const cleanSku = sku ? sku.trim() : '';

      if (!name) {
        req.flash('error', 'O nome da peça é obrigatório.');
        return res.redirect(`/parts/${req.params.id}/edit`);
      }

      if (cleanSku) {
        const skuAlreadyExists = await PartModel.skuExists(cleanSku, req.params.id);

        if (skuAlreadyExists) {
          req.flash('error', 'Já existe outra peça cadastrada com esse SKU/código.');
          return res.redirect(`/parts/${req.params.id}/edit`);
        }
      }

      await PartModel.update(req.params.id, {
        supplier_id,
        name,
        sku: cleanSku,
        category,
        description,
        cost_price: parseMoney(cost_price),
        sale_price: parseMoney(sale_price),
        min_stock: parseInteger(min_stock),
        current_stock: parseInteger(current_stock),
        location,
        status
      });

      req.flash('success', 'Peça atualizada com sucesso.');
      return res.redirect('/parts');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao atualizar peça.');
      return res.redirect(`/parts/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const part = await PartModel.findById(req.params.id);

      if (!part) {
        req.flash('error', 'Peça não encontrada.');
        return res.redirect('/parts');
      }

      const newStatus = part.status === 'active' ? 'inactive' : 'active';

      await PartModel.updateStatus(req.params.id, newStatus);

      req.flash('success', `Peça ${newStatus === 'active' ? 'ativada' : 'inativada'} com sucesso.`);
      return res.redirect('/parts');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao alterar status da peça.');
      return res.redirect('/parts');
    }
  }
}

module.exports = PartController;
