const { query } = require('../config/database');

class UserRepository {
  async findByUsername(username) {
    const rows = await query(
      'SELECT * FROM users WHERE username = ? AND active = 1 LIMIT 1',
      [username]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  async updateLastLogin(id) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await query('UPDATE users SET last_login = ? WHERE id = ?', [now, id]);
  }

  async updateProfile(id, fullName, email) {
    await query('UPDATE users SET full_name = ?, email = ? WHERE id = ?', [
      fullName,
      email || null,
      id
    ]);
  }

  async updateAccount(id, username, passwordHash) {
    if (passwordHash) {
      await query(
        'UPDATE users SET username = ?, password_hash = ? WHERE id = ?',
        [username, passwordHash, id]
      );
    } else {
      await query('UPDATE users SET username = ? WHERE id = ?', [username, id]);
    }
  }

  async checkUsernameDuplicate(username, excludeId) {
    const rows = await query(
      'SELECT COUNT(*) as count FROM users WHERE username = ? AND id <> ?',
      [username, excludeId]
    );
    return rows[0].count > 0;
  }
}

module.exports = new UserRepository();
