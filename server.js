const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('connect-flash');
const methodOverride = require('method-override');
const ejs = require('ejs');
const path = require('path');
const STATUS_CONFIG = require('./config/statuses');

// Импорт маршрутов и middleware
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const clientRoutes = require('./routes/clients');
const authMiddleware = require('./middleware/auth');

// Импортируем Pool из config/database.js
const dbPool = require('./config/database');

const app = express(); // <-- нужно объявить ДО app.use
const PORT = process.env.PORT || 3040;

// Настройка EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.engine('ejs', ejs.renderFile);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессии
app.use(session({
  store: new pgSession({
    pool: dbPool,
    tableName: 'session'
  }),
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

// Теперь можно использовать app.use
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.messages = {
    error: req.flash('error'),
    success: req.flash('success')
  };
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.STATUS_CONFIG = STATUS_CONFIG;
  next();
});

// --- ГЛОБАЛЬНЫЕ МАРШРУТЫ СНАЧАЛА ---
app.get('/', authMiddleware, (req, res) => res.redirect('/orders'));
app.get('/dashboard', authMiddleware, (req, res) => res.redirect('/orders'));

// --- ПОТОМ ОСТАЛЬНЫЕ МАРШРУТЫ ---
app.use('/', authRoutes);
app.use('/orders', authMiddleware, orderRoutes);
app.use('/clients', authMiddleware, clientRoutes);

// 404
app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});