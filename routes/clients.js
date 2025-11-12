// routes/clients.js
const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const db = require('../config/database'); // Импортируем db
const path = require('path'); // <-- добавь это
const ejs = require('ejs');   // если используешь renderFile

// GET /clients - отобразить список всех клиентов с количеством и последним заказом
router.get('/', async (req, res) => {
  try {
    // Получаем клиентов и информацию о их заказах для отображения в списке
    const clients = await Client.findAll();
    // Для списка можно получить только базовую информацию или количество заказов
    // Давайте получим количество заказов и дату последнего заказа
    const clientsWithInfo = await Promise.all(clients.map(async (client) => {
      const ordersResult = await db.query(`
          SELECT COUNT(*) as count, MAX(order_date) as last_order_date
          FROM orders
          WHERE client_id = $1
      `, [client.id]);
      return {
        ...client,
        orderCount: parseInt(ordersResult.rows[0].count, 10),
        lastOrderDate: ordersResult.rows[0].last_order_date
      };
    }));

    res.render('clients', { clients: clientsWithInfo });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке клиентов.');
    res.redirect('/orders'); // Редиректим на /orders как альтернативу
  }
});

// GET /clients/:id
router.get('/:id', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);

  if (isNaN(clientId)) {
    req.flash('error', 'Неверный ID клиента.');
    return res.redirect('/clients');
  }

  try {
    const client = await Client.findByIdWithOrders(clientId);
    if (!client) {
      req.flash('error', 'Клиент не найден.');
      return res.redirect('/clients');
    }

    const filePath = path.join(__dirname, '../views/client-detail.ejs');

    ejs.renderFile(filePath, {
      client,
      STATUS_CONFIG: res.locals.STATUS_CONFIG,
      messages: res.locals.messages,
      session: req.session
    }, { async: true }, (err, str) => {
      if (err) {
        console.error(err);
        req.flash('error', 'Ошибка при рендеринге клиента.');
        return res.redirect('/clients');
      }
      res.send(str);
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке деталей клиента.');
    res.redirect('/clients');
  }
});

module.exports = router;