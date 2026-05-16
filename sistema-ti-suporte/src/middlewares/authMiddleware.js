function authMiddleware(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Faça login para continuar.');
    return res.redirect('/login');
  }

  return next();
}

module.exports = authMiddleware;
