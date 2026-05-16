const PublicAccessModel = require('../models/PublicAccessModel');

class PublicAccessController {
  static firstAccessForm(req, res) {
    return res.render('pages/auth/first-access', {
      title: 'Primeiro Acesso'
    });
  }

  static async firstAccess(req, res) {
    try {
      const {
        name,
        email,
        phone,
        document,
        address,
        city,
        state,
        password,
        password_confirmation
      } = req.body;

      if (password !== password_confirmation) {
        req.flash('error', 'A confirmação de senha não confere.');
        return res.redirect('/first-access');
      }

      await PublicAccessModel.createClientAccess({
        name,
        email,
        phone,
        document,
        address,
        city,
        state,
        password
      });

      req.flash('success', 'Acesso de cliente criado com sucesso. Você já pode entrar no sistema.');
      return res.redirect('/login');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao criar acesso.');
      return res.redirect('/first-access');
    }
  }

  static forgotPasswordForm(req, res) {
    return res.render('pages/auth/forgot-password', {
      title: 'Esqueci minha senha',
      resetLink: null
    });
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const result = await PublicAccessModel.createPasswordReset(email);

      if (!result) {
        req.flash('success', 'Se o e-mail existir no sistema, uma recuperação será gerada.');
        return res.redirect('/forgot-password');
      }

      return res.render('pages/auth/forgot-password', {
        title: 'Esqueci minha senha',
        resetLink: `/reset-password/${result.token}`
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao solicitar recuperação de senha.');
      return res.redirect('/forgot-password');
    }
  }

  static async resetPasswordForm(req, res) {
    try {
      const resetToken = await PublicAccessModel.findResetToken(req.params.token);

      if (!resetToken) {
        req.flash('error', 'Link de recuperação inválido ou expirado.');
        return res.redirect('/forgot-password');
      }

      return res.render('pages/auth/reset-password', {
        title: 'Redefinir Senha',
        token: req.params.token,
        resetToken
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir recuperação de senha.');
      return res.redirect('/forgot-password');
    }
  }

  static async resetPassword(req, res) {
    try {
      const { password, password_confirmation } = req.body;

      if (password !== password_confirmation) {
        req.flash('error', 'A confirmação de senha não confere.');
        return res.redirect(`/reset-password/${req.params.token}`);
      }

      await PublicAccessModel.resetPassword(req.params.token, password);

      req.flash('success', 'Senha redefinida com sucesso. Entre com sua nova senha.');
      return res.redirect('/login');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao redefinir senha.');
      return res.redirect(`/reset-password/${req.params.token}`);
    }
  }
}

module.exports = PublicAccessController;
