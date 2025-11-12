// models/Client.js
const db = require('../config/database');
const Order = require('./Order'); // Импортируем Order для получения заказов

const Client = {
  // Получить всех клиентов
  findAll: async () => {
    const result = await db.query('SELECT * FROM clients ORDER BY name ASC');
    return result.rows;
  },

  // Найти клиента по ID
  findById: async (id) => {
    const result = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Получить клиента с его заказами
  findByIdWithOrders: async (id) => {
    const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    const client = clientResult.rows[0];
    if (!client) return null;

    // Получаем заказы клиента, отсортированные по дате
    const ordersResult = await db.query(`
        SELECT o.id, o.destination_city, o.status, o.order_date,
               (o.total_amount + o.shipping_cost) AS total_with_shipping
        FROM orders o
        WHERE o.client_id = $1
        ORDER BY o.order_date DESC
    `, [id]);
    client.orders = ordersResult.rows;

    return client;
  },

  // Создать нового клиента
  create: async (name, phone, address) => {
    const result = await db.query(
      'INSERT INTO clients (name, phone, address) VALUES ($1, $2, $3) RETURNING id',
      [name, phone, address]
    );
    return result.rows[0];
  },

  // Обновить клиента
  update: async (id, name, phone, address) => {
    await db.query(
      'UPDATE clients SET name = $1, phone = $2, address = $3 WHERE id = $4',
      [name, phone, address, id]
    );
  },

  findByClientId: async (clientId) => {
  const result = await db.query(`
    SELECT o.*, c.name as client_name, c.phone as client_phone, c.address as client_address
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    WHERE o.client_id = $1
    ORDER BY o.order_date DESC
  `, [clientId]);
  return result.rows;
},

  // Удалить клиента (каскадно удалит связанные заказы из-за ON DELETE CASCADE)
  delete: async (id) => {
    await db.query('DELETE FROM clients WHERE id = $1', [id]);
  },

   // Найти клиента по имени и телефону
  findByPhoneAndName: async (phone, name) => {
    const result = await db.query('SELECT * FROM clients WHERE phone = $1 AND name = $2', [phone, name]);
    return result.rows[0];
  }
};

module.exports = Client;