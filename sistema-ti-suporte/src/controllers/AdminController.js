class AdminController {
  static index(req, res) {
    return res.render('pages/admin/index', {
      title: 'Área Administrativa'
    });
  }
}

module.exports = AdminController;
