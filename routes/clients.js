// routes/clients.js
const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Order = require('../models/Order');
const STATUS_CONFIG = require('../config/statuses');

// GET /clients - отобразить список всех клиентов
router.get('/', async (req, res) => {
  try {
    const clients = await Client.findAll();
    for (let client of clients) {
      // Используем Order.findAll и фильтруем на клиенте
      const allOrders = await Order.findAll();
      const clientOrders = allOrders.filter(order => order.client_id === client.id);
      client.orderCount = clientOrders.length;
      client.lastOrderDate = clientOrders.length > 0 ? clientOrders[0].order_date : null;
    }
    res.render('clients', { 
      clients, 
      STATUS_CONFIG, 
      messages: { 
        error: req.flash('error'), 
        success: req.flash('success') 
      } 
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке клиентов.');
    res.redirect('/dashboard');
  }
});

// GET /clients/new - отобразить форму для создания нового клиента
router.get('/new', (req, res) => {
  res.render('client-form', { 
    client: null, 
    STATUS_CONFIG, 
    messages: { 
      error: req.flash('error'), 
      success: req.flash('success') 
    } 
  });
});

// POST /clients - создать нового клиента
router.post('/', async (req, res) => {
  const { name, phone, address } = req.body;

  if (!name) {
    req.flash('error', 'Имя клиента обязательно.');
    return res.redirect('/clients/new');
  }

  try {
    const clientId = await Client.create(name, phone, address);
    req.flash('success', 'Клиент успешно создан.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при создании клиента.');
    res.redirect('/clients/new');
  }
});

// GET /clients/:id - отобразить детали конкретного клиента
router.get('/:id', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);

  if (isNaN(clientId)) {
    req.flash('error', 'Неверный ID клиента.');
    return res.redirect('/clients');
  }

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      req.flash('error', 'Клиент не найден.');
      return res.redirect('/clients');
    }

    // Получаем заказы клиента через Order.findAll
    const allOrders = await Order.findAll();
    const orders = allOrders.filter(order => order.client_id === clientId);
    client.orders = orders;

    res.render('client-detail', { 
      client, 
      STATUS_CONFIG, 
      messages: { 
        error: req.flash('error'), 
        success: req.flash('success') 
      } 
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке деталей клиента.');
    res.redirect('/clients');
  }
});

// GET /clients/:id/edit - отобразить форму для редактирования клиента
router.get('/:id/edit', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);

  if (isNaN(clientId)) {
    req.flash('error', 'Неверный ID клиента.');
    return res.redirect('/clients');
  }

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      req.flash('error', 'Клиент не найден.');
      return res.redirect('/clients');
    }

    res.render('client-form', { 
      client, 
      STATUS_CONFIG, 
      messages: { 
        error: req.flash('error'), 
        success: req.flash('success') 
      } 
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке клиента для редактирования.');
    res.redirect('/clients');
  }
});

// POST /clients/:id - обновить клиента (используем POST с _method=PUT)
router.post('/:id', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  const { name, phone, address } = req.body;

  if (isNaN(clientId) || !name) {
    req.flash('error', !name ? 'Имя клиента обязательно.' : 'Неверный ID клиента.');
    return res.redirect(`/clients/${clientId}/edit`);
  }

  try {
    await Client.update(clientId, name, phone, address);
    req.flash('success', 'Клиент успешно обновлён.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при обновлении клиента.');
    res.redirect(`/clients/${clientId}/edit`);
  }
});

// DELETE /clients/:id - удалить клиента
router.delete('/:id', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);

  if (isNaN(clientId)) {
    req.flash('error', 'Неверный ID клиента.');
    return res.status(400).send('Bad Request');
  }

  try {
    await Client.delete(clientId);
    req.flash('success', 'Клиент успешно удалён.');
    res.redirect('/clients');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при удалении клиента.');
    res.redirect(`/clients/${clientId}`);
  }
});

module.exports = router;