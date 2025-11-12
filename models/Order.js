// models/Order.js
const db = require('../config/database');

const Order = {
    // Получить все заказы с информацией о клиенте
  findAll: async () => {
    // Запрос включает общую сумму заказа и имя клиента, и общую стоимость доставки
    const result = await db.query(`
        SELECT o.id, o.client_id, c.name as client_name, o.destination_city, o.status, o.order_date,
               (o.total_amount + o.shipping_cost_china_moscow + o.shipping_cost_moscow_destination) AS total_with_shipping,
               o.intermediary_china_moscow,
               o.tracking_number_china_moscow,
               o.intermediary_moscow_destination,
               o.tracking_number_moscow_destination
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        ORDER BY o.order_date DESC
    `);
    return result.rows;
  },

  // Найти заказ по ID с деталями (клиент, товары)
  findById: async (id) => {
    // Сначала получаем основную информацию о заказе
    let result = await db.query(`
        SELECT o.*, c.name as client_name, c.phone as client_phone, c.address as client_address
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.id = $1
    `, [id]);
    const order = result.rows[0];
    if (!order) return null;

    // Затем получаем товары в заказе
    result = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
    order.items = result.rows;

    return order;
  },

  // Создать новый заказ
  create: async (clientId, destinationCity, status, orderDate, shippingCostChinaMoscow, shippingCostMoscowDestination, intermediaryChinaMoscow, trackingNumberChinaMoscow, intermediaryMoscowDestination, trackingNumberMoscowDestination) => {
    const result = await db.query(
      `INSERT INTO orders (client_id, destination_city, status, order_date,
                           shipping_cost_china_moscow, shipping_cost_moscow_destination, -- Вставляем два новых поля
                           intermediary_china_moscow, tracking_number_china_moscow,
                           intermediary_moscow_destination, tracking_number_moscow_destination)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [clientId, destinationCity, status, orderDate,
       shippingCostChinaMoscow || 0, shippingCostMoscowDestination || 0, // Передаём два значения
       intermediaryChinaMoscow, trackingNumberChinaMoscow,
       intermediaryMoscowDestination, trackingNumberMoscowDestination]
    );
    return result.rows[0].id; // Возвращаем ID созданного заказа
  },

    // Обновить заказ
  update: async (id, clientId, destinationCity, status, orderDate, // <-- Параметры: 1, 2, 3, 4
                 shippingCostChinaMoscow, shippingCostMoscowDestination, // 5, 6
                 intermediaryChinaMoscow, trackingNumberChinaMoscow, // 7, 8
                 intermediaryMoscowDestination, trackingNumberMoscowDestination) => {
    await db.query(
      `UPDATE orders SET client_id = $1, destination_city = $2, status = $3, order_date = $4, -- <-- $4 должно быть датой, OK
                           shipping_cost_china_moscow = $5, shipping_cost_moscow_destination = $6, -- $5, $6 - числа, OK
                           intermediary_china_moscow = $7, tracking_number_china_moscow = $8, -- $7, $8 - строки, OK
                           intermediary_moscow_destination = $9, tracking_number_moscow_destination = $10 -- $9, $10 - строки, OK
       WHERE id = $11`, // <-- $11 - id заказа
      [clientId, destinationCity, status, orderDate, // 1, 2, 3, 4
       shippingCostChinaMoscow || 0, shippingCostMoscowDestination || 0, // 5, 6
       intermediaryChinaMoscow, trackingNumberChinaMoscow, // 7, 8
       intermediaryMoscowDestination, trackingNumberMoscowDestination, id] // 9, 10, 11
    );
  },
  

// Получить товар по ID
getItemById: async (id) => {
    const result = await db.query('SELECT * FROM order_items WHERE id = $1', [id]);
    return result.rows[0];
},

  // Удалить заказ (каскадно удалит связанные order_items)
  delete: async (id) => {
    await db.query('DELETE FROM orders WHERE id = $1', [id]);
  },

  // Архивировать заказ (предположим, что статус "Архив" существует или можно использовать его)
  archive: async (id, archiveStatus = 'Архив') => {
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [archiveStatus, id]);
  },

  // Получить товары заказа
  getOrderItems: async (orderId) => {
    const result = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId]);
    return result.rows;
  },

  // Добавить товар в заказ
  addItem: async (orderId, productName, quantity, price) => {
    const itemTotal = quantity * price;
    const result = await db.query(
      'INSERT INTO order_items (order_id, product_name, quantity, price, item_total) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [orderId, productName, quantity, price, itemTotal]
    );
    // После добавления товара нужно пересчитать total_amount в заказе
    await Order.calculateTotalAmount(orderId);
    return result.rows[0].id;
  },

  // Обновить товар в заказе
  updateItem: async (itemId, productName, quantity, price) => {
    const itemTotal = quantity * price;
    await db.query(
      'UPDATE order_items SET product_name = $1, quantity = $2, price = $3, item_total = $4 WHERE id = $5',
      [productName, quantity, price, itemTotal, itemId]
    );
    // Пересчитать total_amount для заказа, к которому принадлежит этот товар
    const orderItemResult = await db.query('SELECT order_id FROM order_items WHERE id = $1', [itemId]);
    if (orderItemResult.rows[0]) {
        await Order.calculateTotalAmount(orderItemResult.rows[0].order_id);
    }
  },

  // Удалить товар из заказа
  deleteItem: async (itemId) => {
    const orderItemResult = await db.query('SELECT order_id FROM order_items WHERE id = $1', [itemId]);
    const orderId = orderItemResult.rows[0]?.order_id;
    await db.query('DELETE FROM order_items WHERE id = $1', [itemId]);
    if (orderId) {
        // Пересчитать total_amount после удаления
        await Order.calculateTotalAmount(orderId);
    }
  },

  // Вспомогательная функция для пересчета total_amount заказа
  calculateTotalAmount: async (orderId) => {
  // Получаем сумму всех товаров в заказе
  const totalResult = await db.query(`
    SELECT COALESCE(SUM(item_total), 0) AS total
    FROM order_items
    WHERE order_id = $1
  `, [orderId]);

  let total = parseFloat(totalResult.rows[0].total || 0);

  // Ограничение по типу numeric(15,2) на всякий случай
  const limit = 9999999999999.99;
  if (total > limit) {
    total = limit;
    console.warn(`⚠️ Total for order ${orderId} exceeded DB limit, capped to ${limit}`);
  };
}
// В файле models/Order.js, внутри объекта Order, добавьте:
  updateItemFields: async (itemId, updates) => {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(itemId); // Добавляем ID в конец для WHERE

    const query = `UPDATE order_items SET ${setClause} WHERE id = $${fields.length + 1}`;
    await db.query(query, values);

    // ПЕРЕСЧИТЫВАЕМ item_total ПОСЛЕ ОБНОВЛЕНИЯ quantity ИЛИ price
    const itemResult = await db.query('SELECT quantity, price FROM order_items WHERE id = $1', [itemId]);
    const item = itemResult.rows[0];
    if (item) {
        const itemTotal = item.quantity * item.price;
        await db.query('UPDATE order_items SET item_total = $1 WHERE id = $2', [itemTotal, itemId]);
        // Теперь пересчитываем total_amount для всего заказа
        const orderItemResult = await db.query('SELECT order_id FROM order_items WHERE id = $1', [itemId]);
        const orderId = orderItemResult.rows[0]?.order_id;
        if (orderId) {
             await Order.calculateTotalAmount(orderId);
        }
    }
},

  // Также добавьте метод getTotalAmount, который вы используете в routes/orders.js:
  getTotalAmount: async (orderId) => {
    const result = await db.query('SELECT total_amount FROM orders WHERE id = $1', [orderId]);
    return parseFloat(result.rows[0]?.total_amount || 0);
  },

  // ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПЕРЕСЧЁТА total_amount заказа
  calculateTotalAmount: async (orderId) => {
    const totalResult = await db.query(`
      SELECT COALESCE(SUM(item_total), 0) AS total
      FROM order_items
      WHERE order_id = $1
    `, [orderId]);

    let total = parseFloat(totalResult.rows[0].total || 0);

    const limit = 9999999999999.99;
    if (total > limit) {
      total = limit;
      console.warn(`⚠️ Total for order ${orderId} exceeded DB limit, capped to ${limit}`);
    }

    await db.query('UPDATE orders SET total_amount = $1 WHERE id = $2', [total, orderId]);
  },
};
};

module.exports = Order;