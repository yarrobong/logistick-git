// server.js
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // Импортируем и вызываем
const flash = require('connect-flash');
const path = require('path');
// const { Pool } = require('pg'); // Больше не нужно импортировать здесь напрямую

// Импорты маршрутов и middleware
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const clientRoutes = require('./routes/clients');
const authMiddleware = require('./middleware/auth');

// Импортируем настройки подключения из config/database.js
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3040;

// Настройка EJS как шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессии
app.use(session({
  secret: 'your_secret_key_here', // Замените на случайный секретный ключ
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Установите в true, если используете HTTPS
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
// app.use('/clients', authMiddleware, clientRoutes); // Пока закомментировано

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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});