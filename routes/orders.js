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
    const clients = await Client.findAll(); // Получаем список клиентов для выпадающего списка
    res.render('order-detail', { order: null, clients, isEditing: false });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке данных для создания заказа.');
    res.redirect('/orders');
  }
});

// POST /orders - создать новый заказ
router.post('/', async (req, res) => {
  // console.log(req.body); // Для отладки
  let { clientId, destinationCity, status, orderDate, shippingCost,
        intermediaryChinaMoscow, trackingNumberChinaMoscow,
        intermediaryMoscowDestination, trackingNumberMoscowDestination,
        newClientName, newClientPhone } = req.body; // Получаем данные нового клиента

  try {
    // Если выбрано "Выберите клиента" и введены данные нового клиента
    if (!clientId && newClientName && newClientPhone) {
        // Создаем нового клиента
        const newClient = await Client.create(newClientName, newClientPhone, null); // address пока null
        clientId = newClient.id; // Используем ID нового клиента
    } else if (!clientId && (!newClientName || !newClientPhone)) {
        // Если выбрано "Выберите клиента" но данные нового клиента не введены
        req.flash('error', 'Пожалуйста, выберите клиента или введите данные нового клиента.');
        return res.redirect('/orders/new');
    }
    // Если clientId уже был выбран, используем его как есть

    const orderId = await Order.create(clientId, destinationCity, status, orderDate, shippingCost,
                                      intermediaryChinaMoscow, trackingNumberChinaMoscow,
                                      intermediaryMoscowDestination, trackingNumberMoscowDestination);
    req.flash('success', 'Заказ успешно создан.');
    res.redirect(`/orders/${orderId}`); // Перенаправляем на страницу деталей нового заказа
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
    const clients = await Client.findAll(); // Получаем список клиентов для выпадающего списка при редактировании
    res.render('order-detail', { order, clients, isEditing: true });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке деталей заказа.');
    res.redirect('/orders');
  }
});

// PUT /orders/:id - обновить заказ (используем POST с _method=PUT)
router.post('/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { clientId, destinationCity, status, shippingCost,
          intermediaryChinaMoscow, trackingNumberChinaMoscow,
          intermediaryMoscowDestination, trackingNumberMoscowDestination } = req.body;

  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.redirect('/orders');
  }

  try {
    // При редактировании можно только выбрать существующего клиента
    await Order.update(orderId, clientId, destinationCity, status, shippingCost,
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
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при удалении заказа.');
    res.status(500).send('Internal Server Error');
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

// POST /orders/:orderId/items - добавить товар в заказ
router.post('/:orderId/items', async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const { productName, quantity, price } = req.body;

  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.redirect(`/orders/${orderId}`);
  }

  try {
    await Order.addItem(orderId, productName, parseInt(quantity, 10), parseFloat(price));
    req.flash('success', 'Товар успешно добавлен.');
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при добавлении товара.');
    res.redirect(`/orders/${orderId}`);
  }
});

// PUT /orders/:orderId/items/:itemId - обновить товар в заказе (используем POST с _method=PUT)
router.post('/:orderId/items/:itemId', async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const itemId = parseInt(req.params.itemId, 10);
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