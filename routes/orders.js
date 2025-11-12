// routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Client = require('../models/Client');

// GET /orders - отобразить список всех заказов
router.get('/', async (req, res) => {
  try {
    const orders = await Order.findAll();
    res.render('orders', { orders });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке заказов.');
    res.redirect('/dashboard');
  }
});

// GET /orders/new - отобразить форму для создания нового заказа
router.get('/new', async (req, res) => {
  try {
    const clients = await Client.findAll();
    res.render('order-detail', { order: null, clients, isEditing: false });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке данных для создания заказа.');
    res.redirect('/orders');
  }
});

// POST /orders - создать новый заказ
router.post('/', async (req, res) => {
  const { clientName, clientPhone, destinationCity, status, orderDate,
          shippingCostChinaMoscow, shippingCostMoscowDestination,
          intermediaryChinaMoscow, trackingNumberChinaMoscow,
          intermediaryMoscowDestination, trackingNumberMoscowDestination } = req.body;

  if (!clientName || !orderDate) {
    req.flash('error', !clientName ? 'Имя клиента обязательно.' : 'Дата заказа обязательна.');
    return res.redirect(!clientName ? '/orders/new' : '/orders/new');
  }

  try {
    let clientId = null;
    if (req.body.clientId) {
        clientId = parseInt(req.body.clientId, 10);
        const existingClient = await Client.findById(clientId);
        if (existingClient && (existingClient.name !== clientName || existingClient.phone !== clientPhone)) {
            await Client.update(clientId, clientName, clientPhone, existingClient.address);
        }
    } else {
        let client = await Client.findByPhoneAndName(clientPhone, clientName);
        if (!client) {
            const newClient = await Client.create(clientName, clientPhone, null);
            clientId = newClient.id;
        } else {
            clientId = client.id;
        }
    }

    const orderId = await Order.create(clientId, destinationCity, status, orderDate,
                                      shippingCostChinaMoscow, shippingCostMoscowDestination,
                                      intermediaryChinaMoscow, trackingNumberChinaMoscow,
                                      intermediaryMoscowDestination, trackingNumberMoscowDestination);
    req.flash('success', 'Заказ успешно создан.');
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при создании заказа.');
    res.redirect('/orders/new');
  }
});

// GET /orders/:id - отобразить детали конкретного заказа
router.get('/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.redirect('/orders');
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      req.flash('error', 'Заказ не найден.');
      return res.redirect('/orders');
    }
    const clients = await Client.findAll();
    res.render('order-detail', { order, clients, isEditing: true });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке деталей заказа.');
    res.redirect('/orders');
  }
});

// DELETE /orders/:id - удалить заказ
router.delete('/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.status(400).send('Bad Request');
  }

  try {
    await Order.delete(orderId);
    req.flash('success', 'Заказ успешно удален.');
    res.redirect('/orders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при удалении заказа.');
    res.redirect('/orders');
  }
});

// PUT /orders/:id - обновить заказ (используем POST с _method=PUT)
router.post('/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { clientName, clientPhone, destinationCity, status, orderDate,
          shippingCostChinaMoscow, shippingCostMoscowDestination,
          intermediaryChinaMoscow, trackingNumberChinaMoscow,
          intermediaryMoscowDestination, trackingNumberMoscowDestination } = req.body;

  if (isNaN(orderId) || !clientName || !orderDate) {
    req.flash('error', !clientName ? 'Имя клиента обязательно.' : 'Дата заказа обязательна.');
    return res.redirect(`/orders/${orderId}`);
  }

  try {
    let clientId = null;
    if (req.body.clientId) {
        clientId = parseInt(req.body.clientId, 10);
        const existingClient = await Client.findById(clientId);
        if (existingClient && (existingClient.name !== clientName || existingClient.phone !== clientPhone)) {
            await Client.update(clientId, clientName, clientPhone, existingClient.address);
        }
    } else {
        let client = await Client.findByPhoneAndName(clientPhone, clientName);
        if (!client) {
            const newClient = await Client.create(clientName, clientPhone, null);
            clientId = newClient.id;
        } else {
            clientId = client.id;
        }
    }

    await Order.update(orderId, clientId, destinationCity, status, orderDate,
                       shippingCostChinaMoscow, shippingCostMoscowDestination,
                       intermediaryChinaMoscow, trackingNumberChinaMoscow,
                       intermediaryMoscowDestination, trackingNumberMoscowDestination);
    req.flash('success', 'Заказ успешно обновлен.');
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при обновлении заказа.');
    res.redirect(`/orders/${orderId}`);
  }
});

// POST /orders/:id/archive - архивировать заказ
router.post('/:id/archive', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.redirect('/orders');
  }

  try {
    await Order.archive(orderId);
    req.flash('success', 'Заказ успешно архивирован.');
    res.redirect('/orders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при архивировании заказа.');
    res.redirect(`/orders/${orderId}`);
  }
});

// --- НОВЫЙ МАРШРУТ: Inline-редактирование товара ---
router.post('/:orderId/items/:itemId', async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const itemId = parseInt(req.params.itemId, 10);
  const { quantity, price, product_name, received_quantity } = req.body;

  if (isNaN(orderId) || isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid order ID or item ID' });
  }

  // Проверяем, является ли это inline-обновлением (т.е. пришли только отдельные поля)
  if (quantity !== undefined || price !== undefined || product_name !== undefined || received_quantity !== undefined) {
    try {
      const updates = {};
      if (quantity !== undefined) {
        const q = parseFloat(quantity);
        if (isNaN(q) || q < 1) return res.status(400).json({ error: 'Invalid quantity' });
        updates.quantity = q;
      }
      if (price !== undefined) {
        const p = parseFloat(price);
        if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Invalid price' });
        updates.price = p;
      }
      if (product_name !== undefined) {
        if (!product_name || product_name.trim() === '') return res.status(400).json({ error: 'Product name cannot be empty' });
        updates.product_name = product_name.trim();
      }
      if (received_quantity !== undefined) {
        const rec = parseInt(received_quantity);
        if (isNaN(rec) || rec < 0) return res.status(400).json({ error: 'Invalid received quantity' });
        const itemResult = await db.query('SELECT quantity FROM order_items WHERE id = $1', [itemId]);
        const item = itemResult.rows[0];
        if (item && rec > item.quantity) return res.status(400).json({ error: 'Received quantity cannot exceed total quantity' });
        updates.received_quantity = rec;
      }

      if (Object.keys(updates).length > 0) {
        await Order.updateItemFields(itemId, updates);
        const updatedItem = await Order.getItemById(itemId);
        const totalResult = await Order.getTotalAmount(orderId);
        return res.json({ success: true, item: updatedItem, totalAmount: totalResult });
      } else {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error updating item' });
    }
  }

  // Если это не inline-обновление, значит, это старый маршрут PUT через POST с _method
  // Но мы его больше не используем, т.к. inline-редактирование покрывает все случаи
  // или, если вы всё-таки хотите поддерживать _method=PUT, добавьте проверку:
  if (req.body._method === 'PUT') {
    // Логика старого PUT-маршрута
    const { productName, quantity, price } = req.body;
    if (isNaN(orderId) || isNaN(itemId)) {
      req.flash('error', 'Неверный ID заказа или товара.');
      return res.redirect(`/orders/${orderId}`);
    }
    try {
      await Order.updateItem(itemId, productName, parseInt(quantity, 10), parseFloat(price));
      req.flash('success', 'Товар успешно обновлен.');
      res.redirect(`/orders/${orderId}`);
    } catch (err) {
      console.error(err);
      req.flash('error', 'Ошибка при обновлении товара.');
      res.redirect(`/orders/${orderId}`);
    }
  } else {
    return res.status(400).json({ error: 'This endpoint is for inline updates or PUT with _method only' });
  }
});

// POST /orders/:orderId/items - добавить товар в заказ
router.post('/:orderId/items', async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const { product_name, quantity, price } = req.body;

  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.redirect('/orders');
  }

  if (!product_name || product_name.trim() === '') {
    req.flash('error', 'Название товара обязательно.');
    return res.redirect(`/orders/${orderId}`);
  }

  const qty = parseInt(quantity, 10);
  const pr = parseFloat(price);

  if (isNaN(qty) || qty <= 0) {
    req.flash('error', 'Некорректное количество.');
    return res.redirect(`/orders/${orderId}`);
  }

  if (isNaN(pr) || pr < 0) {
    req.flash('error', 'Некорректная цена.');
    return res.redirect(`/orders/${orderId}`);
  }

  try {
    await Order.addItem(orderId, product_name.trim(), qty, pr);
    req.flash('success', 'Товар успешно добавлен.');
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при добавлении товара.');
    res.redirect(`/orders/${orderId}`);
  }
});

// DELETE /orders/:orderId/items/:itemId - удалить товар из заказа
router.delete('/:orderId/items/:itemId', async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const itemId = parseInt(req.params.itemId, 10);

  if (isNaN(orderId) || isNaN(itemId)) {
    req.flash('error', 'Неверный ID заказа или товара.');
    return res.status(400).send('Bad Request');
  }

  try {
    await Order.deleteItem(itemId);
    req.flash('success', 'Товар успешно удален.');
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при удалении товара.');
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;