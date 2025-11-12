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
  const { clientName, clientPhone, destinationCity, status, orderDate,
          shippingCostChinaMoscow, shippingCostMoscowDestination,
          intermediaryChinaMoscow, trackingNumberChinaMoscow,
          intermediaryMoscowDestination, trackingNumberMoscowDestination } = req.body;

  console.log('DEBUG POST /: req.body.orderDate =', orderDate, 'Type:', typeof orderDate);

  // Проверяем, что имя клиента введено
  if (!clientName) {
    req.flash('error', 'Имя клиента обязательно.');
    return res.redirect('/orders/new');
  }

  if (!orderDate) {
    req.flash('error', 'Дата заказа обязательна.');
    return res.redirect('/orders/new');
  }

  try {
    let clientId = null;

    // Если clientId передан скрытым полем (редактирование), используем его
    if (req.body.clientId) {
        clientId = parseInt(req.body.clientId, 10);
        // Обновим данные клиента, если они изменились
        const existingClient = await Client.findById(clientId);
        if (existingClient) {
            if (existingClient.name !== clientName || existingClient.phone !== clientPhone) {
                await Client.update(clientId, clientName, clientPhone, existingClient.address); // address оставляем как есть или можно добавить в форму
            }
        }
    } else {
        // Если clientId не передан, ищем существующего клиента по имени и телефону
        let client = await Client.findByPhoneAndName(clientPhone, clientName);

        if (!client) {
            // Если не найден, создаем нового
            const newClient = await Client.create(clientName, clientPhone, null); // address пока null
            clientId = newClient.id;
        } else {
            // Если найден, используем его ID
            clientId = client.id;
        }
    }

    // Используем два новых поля для стоимости доставки
    const orderId = await Order.create(clientId, destinationCity, status, orderDate,
                                      shippingCostChinaMoscow, shippingCostMoscowDestination,
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

// DELETE /orders/:id - удалить заказ
// ПЕРЕМЕЩЁН ВЫШЕ, чтобы избежать конфликта с router.post('/:id')
router.delete('/:id', async (req, res) => {
    console.log("DEBUG DELETE /:id"); // <-- Лог для проверки вызова DELETE
  const orderId = parseInt(req.params.id, 10);

  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.status(400).send('Bad Request');
  }

  try {
    await Order.delete(orderId); // Вызываем метод delete из модели
    req.flash('success', 'Заказ успешно удален.');
    // Важно: выполнить только ОДИН ответ
    res.redirect('/orders'); // Перенаправляем на список после удаления
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при удалении заказа.');
    res.redirect('/orders'); // Перенаправляем обратно со flash-сообщением об ошибке
  }
  // Удаляем строку res.redirect('/orders'); за пределами catch
});

// PUT /orders/:id - обновить заказ (используем POST с _method=PUT)
// ПЕРЕМЕЩЁН НИЖЕ, чтобы избежать конфликта с router.delete('/:id')
router.post('/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { clientName, clientPhone, destinationCity, status, orderDate,
          shippingCostChinaMoscow, shippingCostMoscowDestination,
          intermediaryChinaMoscow, trackingNumberChinaMoscow,
          intermediaryMoscowDestination, trackingNumberMoscowDestination } = req.body;

  console.log('DEBUG PUT /:id: req.body.orderDate =', orderDate, 'Type:', typeof orderDate);

  if (isNaN(orderId)) {
    req.flash('error', 'Неверный ID заказа.');
    return res.redirect('/orders');
  }

  // Проверяем, что имя клиента введено
  if (!clientName) {
    req.flash('error', 'Имя клиента обязательно.');
    return res.redirect(`/orders/${orderId}`);
  }

  if (!orderDate) {
      req.flash('error', 'Дата заказа обязательна.');
      return res.redirect(`/orders/${orderId}`);
  }

  try {
    let clientId = null;

    // Если clientId передан скрытым полем (редактирование), используем его
    if (req.body.clientId) {
        clientId = parseInt(req.body.clientId, 10);
        // Обновим данные клиента, если они изменились
        const existingClient = await Client.findById(clientId);
        if (existingClient) {
            if (existingClient.name !== clientName || existingClient.phone !== clientPhone) {
                await Client.update(clientId, clientName, clientPhone, existingClient.address); // address оставляем как есть или можно добавить в форму
            }
        }
    } else {
        // Если clientId не передан, ищем существующего клиента по имени и телефону
        let client = await Client.findByPhoneAndName(clientPhone, clientName);

        if (!client) {
            // Если не найден, создаем нового
            const newClient = await Client.create(clientName, clientPhone, null); // address пока null
            clientId = newClient.id;
        } else {
            // Если найден, используем его ID
            clientId = client.id;
        }
    }

    // Используем два новых поля для стоимости доставки
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