const ClientModel = require('../models/ClientModel');

const statuses = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' }
];

class ClientController {
  static async index(req, res) {
    try {
      const clients = await ClientModel.findAll();

      return res.render('pages/clients/index', {
        title: 'Clientes',
        clients
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar clientes.');
      return res.redirect('/');
    }
  }

  static async create(req, res) {
    try {
      const clientUsers = await ClientModel.getClientUsers();

      return res.render('pages/clients/create', {
        title: 'Novo Cliente',
        statuses,
        clientUsers
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir cadastro de cliente.');
      return res.redirect('/clients');
    }
  }

  static async store(req, res) {
    try {
      const {
        user_id,
        name,
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

      if (!name) {
        req.flash('error', 'O nome do cliente é obrigatório.');
        return res.redirect('/clients/create');
      }

      await ClientModel.create({
        user_id,
        name,
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

      req.flash('success', 'Cliente cadastrado com sucesso.');
      return res.redirect('/clients');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao cadastrar cliente.');
      return res.redirect('/clients/create');
    }
  }

  static async show(req, res) {
    try {
      const client = await ClientModel.findById(req.params.id);

      if (!client) {
        req.flash('error', 'Cliente não encontrado.');
        return res.redirect('/clients');
      }

      return res.render('pages/clients/show', {
        title: 'Detalhes do Cliente',
        client
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar cliente.');
      return res.redirect('/clients');
    }
  }

  static async edit(req, res) {
    try {
      const client = await ClientModel.findById(req.params.id);

      if (!client) {
        req.flash('error', 'Cliente não encontrado.');
        return res.redirect('/clients');
      }

      const clientUsers = await ClientModel.getClientUsers();

      return res.render('pages/clients/edit', {
        title: 'Editar Cliente',
        client,
        statuses,
        clientUsers
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição do cliente.');
      return res.redirect('/clients');
    }
  }

  static async update(req, res) {
    try {
      const {
        user_id,
        name,
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

      const client = await ClientModel.findById(req.params.id);

      if (!client) {
        req.flash('error', 'Cliente não encontrado.');
        return res.redirect('/clients');
      }

      if (!name) {
        req.flash('error', 'O nome do cliente é obrigatório.');
        return res.redirect(`/clients/${req.params.id}/edit`);
      }

      await ClientModel.update(req.params.id, {
        user_id,
        name,
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

      req.flash('success', 'Cliente atualizado com sucesso.');
      return res.redirect('/clients');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao atualizar cliente.');
      return res.redirect(`/clients/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const client = await ClientModel.findById(req.params.id);

      if (!client) {
        req.flash('error', 'Cliente não encontrado.');
        return res.redirect('/clients');
      }

      const newStatus = client.status === 'active' ? 'inactive' : 'active';

      await ClientModel.updateStatus(req.params.id, newStatus);

      req.flash('success', `Cliente ${newStatus === 'active' ? 'ativado' : 'inativado'} com sucesso.`);
      return res.redirect('/clients');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao alterar status do cliente.');
      return res.redirect('/clients');
    }
  }
}

module.exports = ClientController;
