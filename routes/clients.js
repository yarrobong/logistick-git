// routes/clients.js
const express = require('express');
const router = express.Router();
const path = require('path');

const Client = require('../models/Client');
const Order = require('../models/Order');
const STATUS_CONFIG = require('../config/statuses');

// Функция для подготовки данных для шаблона
function renderClientDetail(res, view, data) {
  res.render(view, {
    ...data,
    STATUS_CONFIG,
    messages: {
      error: res.locals.messages?.error || [],
      success: res.locals.messages?.success || []
    },
    session: res.locals.session || {},
    filename: path.join(__dirname, `../views/${view}.ejs`) // важно для include
  });
}

// GET /clients - список всех клиентов
router.get('/', async (req, res) => {
  try {
    const clients = await Client.findAll();
    const allOrders = await Order.findAll(); // один раз

    // Добавляем количество заказов и дату последнего заказа
    clients.forEach(client => {
      const clientOrders = allOrders.filter(o => o.client_id === client.id);
      client.orderCount = clientOrders.length;
      client.lastOrderDate = clientOrders.length > 0
        ? clientOrders.sort((a,b) => new Date(b.order_date) - new Date(a.order_date))[0].order_date
        : null;
    });

    res.render('clients', { clients });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке клиентов.');
    res.redirect('/dashboard');
  }
});

// GET /clients/new - форма создания нового клиента
router.get('/new', (req, res) => {
  renderClientDetail(res, 'client-form', { client: null });
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


// GET /clients/:id - детали клиента
router.get('/:id', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (isNaN(clientId)) {
    req.flash('error', 'Неверный ID клиента.');
    return res.redirect('/clients');
  }

  try {
    // Берем клиента вместе с заказами
    const client = await Client.findByIdWithOrders(clientId);
    if (!client) {
      req.flash('error', 'Клиент не найден.');
      return res.redirect('/clients');
    }

    // В res.render передаем только данные, без filename
    res.render('client-detail', { 
      client, 
      STATUS_CONFIG: res.locals.STATUS_CONFIG,
      messages: res.locals.messages,
      session: req.session
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке деталей клиента.');
    res.redirect('/clients');
  }
});

// GET /clients/:id/edit - форма редактирования
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

    renderClientDetail(res, 'client-form', { client });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке клиента для редактирования.');
    res.redirect('/clients');
  }
});

// POST /clients/:id - обновление клиента (с _method=PUT)
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