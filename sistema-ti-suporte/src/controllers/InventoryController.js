const InventoryModel = require('../models/InventoryModel');

function parseNumber(value) {
  if (!value) {
    return 0;
  }

  return Number(String(value).replace(',', '.')) || 0;
}

class InventoryController {
  static async index(req, res) {
    try {
      const stats = await InventoryModel.getStats();
      const parts = await InventoryModel.findParts();

      return res.render('pages/inventory/index', {
        title: 'Estoque',
        stats,
        parts
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar estoque.');
      return res.redirect('/');
    }
  }

  static async movements(req, res) {
    try {
      const movements = await InventoryModel.findMovements();

      return res.render('pages/inventory/movements', {
        title: 'Histórico de Estoque',
        movements
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar histórico de estoque.');
      return res.redirect('/inventory');
    }
  }

  static async lowStock(req, res) {
    try {
      const parts = await InventoryModel.findLowStockParts();

      return res.render('pages/inventory/low-stock', {
        title: 'Estoque Baixo',
        parts
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar estoque baixo.');
      return res.redirect('/inventory');
    }
  }

  static async entryForm(req, res) {
    try {
      const parts = await InventoryModel.findParts();

      return res.render('pages/inventory/entry', {
        title: 'Entrada de Estoque',
        parts,
        selectedPartId: req.query.part_id || ''
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir entrada de estoque.');
      return res.redirect('/inventory');
    }
  }

  static async storeEntry(req, res) {
    try {
      const { part_id, quantity, unit_cost, reason } = req.body;

      if (!part_id) {
        req.flash('error', 'Selecione uma peça.');
        return res.redirect('/inventory/entry');
      }

      await InventoryModel.createEntry({
        part_id,
        quantity: parseNumber(quantity),
        unit_cost: parseNumber(unit_cost),
        reason,
        user_id: req.session.user.id
      });

      req.flash('success', 'Entrada de estoque registrada com sucesso.');
      return res.redirect('/inventory');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao registrar entrada de estoque.');
      return res.redirect('/inventory/entry');
    }
  }

  static async exitForm(req, res) {
    try {
      const parts = await InventoryModel.findParts();

      return res.render('pages/inventory/exit', {
        title: 'Saída de Estoque',
        parts,
        selectedPartId: req.query.part_id || ''
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir saída de estoque.');
      return res.redirect('/inventory');
    }
  }

  static async storeExit(req, res) {
    try {
      const { part_id, quantity, unit_price, reason } = req.body;

      if (!part_id) {
        req.flash('error', 'Selecione uma peça.');
        return res.redirect('/inventory/exit');
      }

      await InventoryModel.createExit({
        part_id,
        quantity: parseNumber(quantity),
        unit_price: parseNumber(unit_price),
        reason,
        user_id: req.session.user.id
      });

      req.flash('success', 'Saída de estoque registrada com sucesso.');
      return res.redirect('/inventory');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao registrar saída de estoque.');
      return res.redirect('/inventory/exit');
    }
  }

  static async adjustmentForm(req, res) {
    try {
      const parts = await InventoryModel.findParts();

      return res.render('pages/inventory/adjustment', {
        title: 'Ajuste de Estoque',
        parts,
        selectedPartId: req.query.part_id || ''
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir ajuste de estoque.');
      return res.redirect('/inventory');
    }
  }

  static async storeAdjustment(req, res) {
    try {
      const { part_id, new_stock, reason } = req.body;

      if (!part_id) {
        req.flash('error', 'Selecione uma peça.');
        return res.redirect('/inventory/adjustment');
      }

      await InventoryModel.createAdjustment({
        part_id,
        new_stock: parseNumber(new_stock),
        reason,
        user_id: req.session.user.id
      });

      req.flash('success', 'Ajuste de estoque registrado com sucesso.');
      return res.redirect('/inventory');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao ajustar estoque.');
      return res.redirect('/inventory/adjustment');
    }
  }
}

module.exports = InventoryController;
