function roleMiddleware(allowedRoles = []) {
  return function checkRole(req, res, next) {
    if (!req.session || !req.session.user) {
      req.flash('error', 'Faça login para continuar.');
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      req.flash('error', 'Você não tem permissão para acessar essa área.');
      return res.redirect('/');
    }

    return next();
  };
}

module.exports = roleMiddleware;
