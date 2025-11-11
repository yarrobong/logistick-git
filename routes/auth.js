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

  try {
    const user = await User.findByUsername(username);

    if (user && await User.comparePassword(password, user.password)) {
      req.session.isLoggedIn = true;
      req.session.userId = user.id; // Сохраняем ID пользователя в сессии (если нужно)
      req.session.username = user.username; // Сохраняем имя пользователя в сессии
      return res.redirect('/dashboard');
    } else {
      req.flash('error', 'Неправильный логин или пароль.');
      res.redirect('/login');
    }
  } catch (err) {
    console.error(err);
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