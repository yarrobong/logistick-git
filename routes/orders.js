// routes/orders.js
const express = require('express');
const router = express.Router();

// Пример временного маршрута
router.get('/', (req, res) => {
  res.send('Список заказов (временно)');
});

module.exports = router; // <-- Очень важно!1