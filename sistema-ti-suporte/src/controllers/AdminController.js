const AdminModel = require('../models/AdminModel');

function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(2)} ${sizes[index]}`;
}

class AdminController {
  static index(req, res) {
    return res.render('pages/admin/index', {
      title: 'Área Administrativa'
    });
  }

  static backups(req, res) {
    const backups = AdminModel.listBackups().map((backup) => ({
      ...backup,
      size_label: formatBytes(backup.size)
    }));

    return res.render('pages/admin/backups', {
      title: 'Backups',
      backups
    });
  }

  static async createBackup(req, res) {
    try {
      const filename = await AdminModel.createBackup();

      req.flash('success', `Backup criado com sucesso: ${filename}`);
      return res.redirect('/admin/backups');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao criar backup.');
      return res.redirect('/admin/backups');
    }
  }

  static downloadBackup(req, res) {
    try {
      const filePath = AdminModel.getBackupPath(req.params.filename);
      return res.download(filePath);
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao baixar backup.');
      return res.redirect('/admin/backups');
    }
  }

  static deleteBackup(req, res) {
    try {
      AdminModel.deleteBackup(req.params.filename);

      req.flash('success', 'Backup excluído com sucesso.');
      return res.redirect('/admin/backups');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao excluir backup.');
      return res.redirect('/admin/backups');
    }
  }

  static async logs(req, res) {
    try {
      const logs = await AdminModel.listLogs();

      return res.render('pages/admin/logs', {
        title: 'Logs do Sistema',
        logs
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar logs.');
      return res.redirect('/admin');
    }
  }

  static async clearLogs(req, res) {
    try {
      await AdminModel.clearLogs();

      req.flash('success', 'Logs limpos com sucesso.');
      return res.redirect('/admin/logs');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao limpar logs.');
      return res.redirect('/admin/logs');
    }
  }

  static permissions(req, res) {
    return res.render('pages/admin/permissions', {
      title: 'Permissões',
      permissions: AdminModel.getPermissions()
    });
  }
}

module.exports = AdminController;
