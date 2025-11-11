// server.js
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // Импортируем и вызываем
const flash = require('connect-flash');
const path = require('path');
const { Pool } = require('pg'); // Импортируем Pool из pg

// Импорты маршрутов и middleware
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const clientRoutes = require('./routes/clients');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3040;

// --- НАСТРОЙКА БАЗЫ ДАННЫХ ДЛЯ СЕССИЙ ---
// Создаем пул подключений для сессий, используя те же параметры, что и в config/database.js
const pgPool = new Pool({
  user: 'your_db_user', // Замените на ваши данные
  host: 'your_db_host',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
});

// --- НАСТРОЙКА СЕССИИ ---
app.use(session({
  store: new pgSession({
    pool: pgPool, // Используем созданный пул
    tableName: 'user_sessions' // Имя таблицы для хранения сессий
  }),
  secret: 'your_really_long_and_random_secret_key_here', // ВАЖНО: замените на надежный ключ!
  resave: false, // Рекомендуется false
  saveUninitialized: false, // Не сохраняем неинициализированные сессии
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней (в миллисекундах)
    secure: false, // Установите в true, если используете HTTPS
    httpOnly: true, // Рекомендуется для безопасности
    // sameSite: 'lax', // Рекомендуется для CSRF
  }
}));

// Остальные middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
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

// Корневой маршрут
app.get('/', authMiddleware, (req, res) => {
  res.redirect('/orders');
});

// Старая страница дашборда
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