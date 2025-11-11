// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

router.get('/login', (req, res) => {
  let errorMessage = req.flash('error')[0] || null;
  res.render('login', { errorMessage });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('Попытка входа для:', username); // <-- Добавить
  console.log('Введенный пароль (логгируем ВРЕМЕННО для отладки):', password); // <-- Добавить (удалите позже!)

  try {
    const user = await User.findByUsername(username);
    console.log('Найден пользователь в БД:', user ? user.username : 'Не найден'); // <-- Добавить

    if (user && await User.comparePassword(password, user.password)) {
      console.log('Пароль верен, создаем сессию'); // <-- Добавить
      req.session.isLoggedIn = true;
      req.session.userId = user.id;
      req.session.username = user.username;
      return res.redirect('/dashboard');
    } else {
      console.log('Пароль НЕ верен или пользователь не найден'); // <-- Добавить
      req.flash('error', 'Неправильный логин или пароль.');
      res.redirect('/login');
    }
  } catch (err) {
    console.error('Ошибка при входе:', err); // <-- Уточнить лог
    req.flash('error', 'Произошла ошибка при входе.');
    res.redirect('/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/login');
  });
});

module.exports = router;