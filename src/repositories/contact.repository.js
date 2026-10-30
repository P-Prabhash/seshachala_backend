const { query } = require('../config/database');

class ContactRepository {
  async create({ name, email, subject, message }) {
    const res = await query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name, email, subject || null, message]
    );
    return res.insertId;
  }

  async findAll() {
    return await query('SELECT * FROM contact_messages ORDER BY id DESC');
  }

  async findById(id) {
    const rows = await query('SELECT * FROM contact_messages WHERE id = ?', [id]);
    return rows[0] || null;
  }
}

module.exports = new ContactRepository();
