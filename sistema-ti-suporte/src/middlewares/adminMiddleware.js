function adminMiddleware(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Faça login para continuar.');
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    req.flash('error', 'Você não tem permissão para acessar essa área.');
    return res.redirect('/');
  }

  return next();
}

module.exports = adminMiddleware;
