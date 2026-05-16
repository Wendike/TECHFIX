const SupplierModel = require('../models/SupplierModel');

const statuses = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' }
];

class SupplierController {
  static async index(req, res) {
    try {
      const suppliers = await SupplierModel.findAll();

      return res.render('pages/suppliers/index', {
        title: 'Fornecedores',
        suppliers
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar fornecedores.');
      return res.redirect('/');
    }
  }

  static async create(req, res) {
    try {
      const supplierUsers = await SupplierModel.getSupplierUsers();

      return res.render('pages/suppliers/create', {
        title: 'Novo Fornecedor',
        statuses,
        supplierUsers
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir cadastro de fornecedor.');
      return res.redirect('/suppliers');
    }
  }

  static async store(req, res) {
    try {
      const {
        user_id,
        company_name,
        contact_name,
        email,
        phone,
        document,
        address,
        city,
        state,
        zip_code,
        notes,
        status
      } = req.body;

      if (!company_name) {
        req.flash('error', 'O nome da empresa/fornecedor é obrigatório.');
        return res.redirect('/suppliers/create');
      }

      await SupplierModel.create({
        user_id,
        company_name,
        contact_name,
        email,
        phone,
        document,
        address,
        city,
        state,
        zip_code,
        notes,
        status
      });

      req.flash('success', 'Fornecedor cadastrado com sucesso.');
      return res.redirect('/suppliers');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao cadastrar fornecedor.');
      return res.redirect('/suppliers/create');
    }
  }

  static async show(req, res) {
    try {
      const supplier = await SupplierModel.findById(req.params.id);

      if (!supplier) {
        req.flash('error', 'Fornecedor não encontrado.');
        return res.redirect('/suppliers');
      }

      return res.render('pages/suppliers/show', {
        title: 'Detalhes do Fornecedor',
        supplier
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar fornecedor.');
      return res.redirect('/suppliers');
    }
  }

  static async edit(req, res) {
    try {
      const supplier = await SupplierModel.findById(req.params.id);

      if (!supplier) {
        req.flash('error', 'Fornecedor não encontrado.');
        return res.redirect('/suppliers');
      }

      const supplierUsers = await SupplierModel.getSupplierUsers();

      return res.render('pages/suppliers/edit', {
        title: 'Editar Fornecedor',
        supplier,
        statuses,
        supplierUsers
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição do fornecedor.');
      return res.redirect('/suppliers');
    }
  }

  static async update(req, res) {
    try {
      const {
        user_id,
        company_name,
        contact_name,
        email,
        phone,
        document,
        address,
        city,
        state,
        zip_code,
        notes,
        status
      } = req.body;

      const supplier = await SupplierModel.findById(req.params.id);

      if (!supplier) {
        req.flash('error', 'Fornecedor não encontrado.');
        return res.redirect('/suppliers');
      }

      if (!company_name) {
        req.flash('error', 'O nome da empresa/fornecedor é obrigatório.');
        return res.redirect(`/suppliers/${req.params.id}/edit`);
      }

      await SupplierModel.update(req.params.id, {
        user_id,
        company_name,
        contact_name,
        email,
        phone,
        document,
        address,
        city,
        state,
        zip_code,
        notes,
        status
      });

      req.flash('success', 'Fornecedor atualizado com sucesso.');
      return res.redirect('/suppliers');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao atualizar fornecedor.');
      return res.redirect(`/suppliers/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const supplier = await SupplierModel.findById(req.params.id);

      if (!supplier) {
        req.flash('error', 'Fornecedor não encontrado.');
        return res.redirect('/suppliers');
      }

      const newStatus = supplier.status === 'active' ? 'inactive' : 'active';

      await SupplierModel.updateStatus(req.params.id, newStatus);

      req.flash('success', `Fornecedor ${newStatus === 'active' ? 'ativado' : 'inativado'} com sucesso.`);
      return res.redirect('/suppliers');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao alterar status do fornecedor.');
      return res.redirect('/suppliers');
    }
  }
}

module.exports = SupplierController;
