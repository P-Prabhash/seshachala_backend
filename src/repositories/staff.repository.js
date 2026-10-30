const { query, transaction } = require('../config/database');

class StaffRepository {
  async findAll({ search = '', status = '' }) {
    let sql = `
      SELECT s.*, u.last_login AS user_last_login
      FROM staff s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      const like = `%${search}%`;
      sql += ' AND (s.name LIKE ? OR s.username LIKE ? OR s.mobile LIKE ? OR s.email LIKE ?)';
      params.push(like, like, like, like);
    }

    if (status === 'active') {
      sql += " AND LOWER(COALESCE(s.status, 'active')) = 'active'";
    } else if (status === 'inactive') {
      sql += " AND LOWER(COALESCE(s.status, '')) IN ('inactive', 'disabled')";
    }

    sql += ' ORDER BY s.id DESC';

    return await query(sql, params);
  }

  async findStats() {
    const [total] = await query('SELECT COUNT(*) AS count FROM staff');
    const [active] = await query("SELECT COUNT(*) AS count FROM staff WHERE LOWER(COALESCE(status, 'active')) = 'active'");
    const [inactive] = await query("SELECT COUNT(*) AS count FROM staff WHERE LOWER(COALESCE(status, '')) IN ('inactive', 'disabled')");

    return {
      total: total.count,
      active: active.count,
      inactive: inactive.count
    };
  }

  async findById(id) {
    const rows = await query(
      `SELECT s.*, u.active AS user_active, u.last_login AS user_last_login,
              u.created_at AS user_created_at
       FROM staff s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async createStaff(staffData, passwordHash) {
    return await transaction(async (conn) => {
      const [userRes] = await conn.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          staffData.username,
          staffData.email || null,
          passwordHash,
          staffData.name,
          'Staff',
          staffData.status === 'Active' ? 1 : 0
        ]
      );

      const userId = userRes.insertId;

      await conn.query(
        `INSERT INTO staff (user_id, name, username, mobile, email, role, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          staffData.name,
          staffData.username,
          staffData.mobile || null,
          staffData.email || null,
          'Staff',
          staffData.status,
          passwordHash
        ]
      );

      return userId;
    });
  }

  async updateStaff(id, userId, staffData, passwordHash = null) {
    return await transaction(async (conn) => {
      await conn.query(
        `UPDATE users
         SET username = ?, email = ?, full_name = ?, active = ?
         WHERE id = ?`,
        [
          staffData.username,
          staffData.email || null,
          staffData.name,
          staffData.status === 'Active' ? 1 : 0,
          userId
        ]
      );

      await conn.query(
        `UPDATE staff
         SET name = ?, username = ?, mobile = ?, email = ?, status = ?
         WHERE id = ?`,
        [
          staffData.name,
          staffData.username,
          staffData.mobile || null,
          staffData.email || null,
          staffData.status,
          id
        ]
      );

      if (passwordHash) {
        await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        await conn.query('UPDATE staff SET password_hash = ? WHERE id = ?', [passwordHash, id]);
      }
    });
  }

  async updatePermissions(id, userId, role) {
    await transaction(async (conn) => {
      await conn.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
      await conn.query('UPDATE staff SET role = ? WHERE id = ?', [role, id]);
    });
  }

  async toggleStatus(id, userId, newStatus) {
    const active = newStatus === 'Active' ? 1 : 0;
    await transaction(async (conn) => {
      await conn.query('UPDATE staff SET status = ? WHERE id = ?', [newStatus, id]);
      await conn.query('UPDATE users SET active = ? WHERE id = ?', [active, userId]);
    });
  }

  async deleteStaff(id, userId) {
    await transaction(async (conn) => {
      if (userId) {
        await conn.query('DELETE FROM users WHERE id = ?', [userId]);
      }
      await conn.query('DELETE FROM staff WHERE id = ?', [id]);
    });
  }
}

module.exports = new StaffRepository();
