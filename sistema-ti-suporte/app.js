const express = require('express');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const methodOverride = require('method-override');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const routes = require('./src/routes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(compression());
app.use(morgan('dev'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({
    db: 'sessions.sqlite',
    dir: './storage/sessions'
  }),
  secret: process.env.SESSION_SECRET || 'techfix_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'TECHFIX';
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use(routes);

app.use((req, res) => {
  res.status(404).render('pages/errors/404', {
    title: 'Página não encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('pages/errors/500', {
    title: 'Erro interno',
    error: process.env.NODE_ENV === 'development' ? err : null
  });
});

module.exports = app;
