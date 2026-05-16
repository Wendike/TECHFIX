function roleMiddleware(...allowedRoles) {
  return function (req, res, next) {
    const user = req.session?.user;

    if (!user) {
      req.flash('error', 'Faça login para continuar.');
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).render('pages/errors/403', {
        title: 'Acesso negado',
        allowedRoles
      });
    }

    return next();
  };
}

module.exports = roleMiddleware;
