// models/Client.js
const db = require('../config/database');

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

  // Удалить клиента (каскадно удалит связанные заказы из-за ON DELETE CASCADE)
  delete: async (id) => {
    await db.query('DELETE FROM clients WHERE id = $1', [id]);
  }
};

module.exports = Client;