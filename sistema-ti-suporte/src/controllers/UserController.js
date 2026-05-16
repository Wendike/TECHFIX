const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');

const roles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'standard', label: 'Padrão' },
  { value: 'client', label: 'Cliente' },
  { value: 'supplier', label: 'Fornecedor' }
];

const statuses = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' }
];

class UserController {
  static async index(req, res) {
    const users = await UserModel.findAll();

    return res.render('pages/users/index', {
      title: 'Usuários',
      users
    });
  }

  static create(req, res) {
    return res.render('pages/users/create', {
      title: 'Novo Usuário',
      roles,
      statuses,
      form: {}
    });
  }

  static async store(req, res) {
    try {
      const {
        name,
        email,
        password,
        password_confirmation,
        role,
        phone,
        document,
        status
      } = req.body;

      if (!name || !email || !password || !password_confirmation || !role) {
        req.flash('error', 'Preencha todos os campos obrigatórios.');
        return res.redirect('/users/create');
      }

      if (password.length < 6) {
        req.flash('error', 'A senha precisa ter pelo menos 6 caracteres.');
        return res.redirect('/users/create');
      }

      if (password !== password_confirmation) {
        req.flash('error', 'A confirmação de senha não confere.');
        return res.redirect('/users/create');
      }

      const emailAlreadyExists = await UserModel.emailExists(email);

      if (emailAlreadyExists) {
        req.flash('error', 'Já existe um usuário cadastrado com esse e-mail.');
        return res.redirect('/users/create');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await UserModel.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        document,
        status: status || 'active'
      });

      req.flash('success', 'Usuário cadastrado com sucesso.');
      return res.redirect('/users');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao cadastrar usuário.');
      return res.redirect('/users/create');
    }
  }

  static async show(req, res) {
    const userData = await UserModel.findById(req.params.id);

    if (!userData) {
      req.flash('error', 'Usuário não encontrado.');
      return res.redirect('/users');
    }

    return res.render('pages/users/show', {
      title: 'Detalhes do Usuário',
      userData
    });
  }

  static async edit(req, res) {
    const userData = await UserModel.findById(req.params.id);

    if (!userData) {
      req.flash('error', 'Usuário não encontrado.');
      return res.redirect('/users');
    }

    return res.render('pages/users/edit', {
      title: 'Editar Usuário',
      userData,
      roles,
      statuses
    });
  }

  static async update(req, res) {
    try {
      const {
        name,
        email,
        password,
        password_confirmation,
        role,
        phone,
        document,
        status
      } = req.body;

      const userData = await UserModel.findById(req.params.id);

      if (!userData) {
        req.flash('error', 'Usuário não encontrado.');
        return res.redirect('/users');
      }

      if (!name || !email || !role || !status) {
        req.flash('error', 'Preencha todos os campos obrigatórios.');
        return res.redirect(`/users/${req.params.id}/edit`);
      }

      const emailAlreadyExists = await UserModel.emailExists(email, req.params.id);

      if (emailAlreadyExists) {
        req.flash('error', 'Já existe outro usuário com esse e-mail.');
        return res.redirect(`/users/${req.params.id}/edit`);
      }

      await UserModel.update(req.params.id, {
        name,
        email,
        role,
        phone,
        document,
        status
      });

      if (password) {
        if (password.length < 6) {
          req.flash('error', 'A nova senha precisa ter pelo menos 6 caracteres.');
          return res.redirect(`/users/${req.params.id}/edit`);
        }

        if (password !== password_confirmation) {
          req.flash('error', 'A confirmação da nova senha não confere.');
          return res.redirect(`/users/${req.params.id}/edit`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await UserModel.updatePassword(req.params.id, hashedPassword);
      }

      if (Number(req.session.user.id) === Number(req.params.id)) {
        req.session.user.name = name;
        req.session.user.email = email;
        req.session.user.role = role;
      }

      req.flash('success', 'Usuário atualizado com sucesso.');
      return res.redirect('/users');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao atualizar usuário.');
      return res.redirect(`/users/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const userId = Number(req.params.id);

      if (Number(req.session.user.id) === userId) {
        req.flash('error', 'Você não pode inativar seu próprio usuário.');
        return res.redirect('/users');
      }

      const userData = await UserModel.findById(userId);

      if (!userData) {
        req.flash('error', 'Usuário não encontrado.');
        return res.redirect('/users');
      }

      const newStatus = userData.status === 'active' ? 'inactive' : 'active';

      await UserModel.updateStatus(userId, newStatus);

      req.flash('success', `Usuário ${newStatus === 'active' ? 'ativado' : 'inativado'} com sucesso.`);
      return res.redirect('/users');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao alterar status do usuário.');
      return res.redirect('/users');
    }
  }
}

module.exports = UserController;
