// models/Order.js
const db = require('../config/database');

const Order = {
  // Получить все заказы с информацией о клиенте
  findAll: async () => {
    // Запрос включает общую сумму заказа и имя клиента
    const result = await db.query(`
        SELECT o.id, o.client_id, c.name as client_name, o.destination_city, o.status, o.order_date,
               (o.total_amount + o.shipping_cost) AS total_with_shipping
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
  create: async (clientId, destinationCity, status, orderDate, shippingCost, intermediaryChinaMoscow, trackingNumberChinaMoscow, intermediaryMoscowDestination, trackingNumberMoscowDestination) => {
    const result = await db.query(
      `INSERT INTO orders (client_id, destination_city, status, order_date, shipping_cost,
                           intermediary_china_moscow, tracking_number_china_moscow,
                           intermediary_moscow_destination, tracking_number_moscow_destination)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [clientId, destinationCity, status, orderDate, shippingCost || 0,
       intermediaryChinaMoscow, trackingNumberChinaMoscow,
       intermediaryMoscowDestination, trackingNumberMoscowDestination]
    );
    return result.rows[0].id; // Возвращаем ID созданного заказа
  },

  // Обновить заказ
  update: async (id, clientId, destinationCity, status, shippingCost, intermediaryChinaMoscow, trackingNumberChinaMoscow, intermediaryMoscowDestination, trackingNumberMoscowDestination) => {
    await db.query(
      `UPDATE orders SET client_id = $1, destination_city = $2, status = $3, shipping_cost = $4,
                           intermediary_china_moscow = $5, tracking_number_china_moscow = $6,
                           intermediary_moscow_destination = $7, tracking_number_moscow_destination = $8
       WHERE id = $9`,
      [clientId, destinationCity, status, shippingCost || 0,
       intermediaryChinaMoscow, trackingNumberChinaMoscow,
       intermediaryMoscowDestination, trackingNumberMoscowDestination, id]
    );
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
    const result = await db.query(`
        SELECT COALESCE(SUM(item_total), 0) AS sum_total
        FROM order_items
        WHERE order_id = $1
    `, [orderId]);
    const totalAmount = result.rows[0].sum_total;
    await db.query('UPDATE orders SET total_amount = $1 WHERE id = $2', [totalAmount, orderId]);
  }
};

module.exports = Order;