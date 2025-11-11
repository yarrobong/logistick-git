// server.js
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

// Обязательно убедитесь, что файлы routes и middleware существуют и экспортируют правильные значения
const authRoutes = require('./routes/auth'); // Раскомментировано
const orderRoutes = require('./routes/orders'); // Раскомментировано
const clientRoutes = require('./routes/clients'); // Раскомментировано
const authMiddleware = require('./middleware/auth'); // Раскомментировано

const app = express();
const PORT = process.env.PORT || 3040; // Обновил порт до 3040

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
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});

// Маршруты - РАСКОММЕНТИРОВАНЫ
app.use('/', authRoutes); // <-- Раскомментировано
app.use('/orders', authMiddleware, orderRoutes); // <-- Раскомментировано
app.use('/clients', authMiddleware, clientRoutes); // <-- Раскомментировано

// Главная страница (после авторизации)
app.get('/dashboard', authMiddleware, (req, res) => {
  res.render('dashboard');
});

// Обработка 404 - РАСКОММЕНТИРОВАНО
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`); // Обновил лог
});
