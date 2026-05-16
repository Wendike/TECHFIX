const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');

class AuthController {
  static showLogin(req, res) {
    return res.render('pages/auth/login', {
      title: 'Login'
    });
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        req.flash('error', 'Informe o e-mail e a senha.');
        return res.redirect('/login');
      }

      const user = await UserModel.findByEmail(email);

      if (!user) {
        req.flash('error', 'E-mail ou senha inválidos.');
        return res.redirect('/login');
      }

      if (user.status !== 'active') {
        req.flash('error', 'Usuário inativo. Fale com o administrador.');
        return res.redirect('/login');
      }

      const passwordIsValid = await bcrypt.compare(password, user.password);

      if (!passwordIsValid) {
        req.flash('error', 'E-mail ou senha inválidos.');
        return res.redirect('/login');
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      await UserModel.updateLastLogin(user.id);

      req.flash('success', 'Login realizado com sucesso.');
      return res.redirect('/');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao tentar fazer login.');
      return res.redirect('/login');
    }
  }

  static logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.redirect('/login');
    });
  }
}

module.exports = AuthController;
