// server.js
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // Импортируем и вызываем
const flash = require('connect-flash');
const ejs = require('ejs');
const path = require('path');
const STATUS_CONFIG = require('./config/statuses'); // Импортируем конфиг статусов

// Импорты маршрутов и middleware
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const clientRoutes = require('./routes/clients');
const authMiddleware = require('./middleware/auth');

// Импортируем Pool из config/database.js
const dbPool = require('./config/database'); // Теперь это Pool

const app = express();
const PORT = process.env.PORT || 3040;

// Настройка EJS как шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', ejs.renderFile);
app.locals._layoutFile = false; // если используете layouts

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессии
app.use(session({
  store: new pgSession({
    pool: dbPool, // Передаем Pool
    tableName: 'session' // Имя таблицы для хранения сессий (по умолчанию 'session')
  }),
  secret: 'your_secret_key_here', // Замените на случайный секретный ключ
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Установите в true, если используете HTTPS
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней в миллисекундах (опционально)
  }
}));

app.use(flash());

// Установка переменной для проверки аутентификации в шаблонах
app.use((req, res, next) => {
  res.locals.messages = {
    error: req.flash('error'),
    success: req.flash('success')
  };
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});

// Маршруты
app.use('/', authRoutes);
app.use('/orders', authMiddleware, orderRoutes);
app.use('/clients', authMiddleware, clientRoutes); // Пока закомментировано

// Корневой маршрут - перенаправляем на /orders после аутентификации
app.get('/', authMiddleware, (req, res) => {
  res.redirect('/orders');
});

// Старая страница дашборда - тоже перенаправляем
app.get('/dashboard', authMiddleware, (req, res) => {
  res.redirect('/orders');
});

// Обработка 404
app.use((req, res) => {
  res.status(404).render('404');
});

// Установка переменной для проверки аутентификации в шаблонах и статусов
app.use((req, res, next) => {
  res.locals.messages = {
    error: req.flash('error'),
    success: req.flash('success')
  };
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.STATUS_CONFIG = STATUS_CONFIG; // Делаем статусы доступными в шаблонах
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});