const { query, transaction } = require('../config/database');

class SettingsRepository {
  async getCollegeSettings() {
    const rows = await query('SELECT * FROM college_settings WHERE id = 1');
    return rows[0] || {};
  }

  async updateCollegeSettings(data) {
    await query(
      `UPDATE college_settings
       SET college_name = ?, subtitle = ?, address = ?, phone = ?, email = ?, website = ?, logo_path = ?
       WHERE id = 1`,
      [
        data.college_name,
        data.subtitle,
        data.address,
        data.phone,
        data.email,
        data.website,
        data.logo_path || '/static/images/logo.png'
      ]
    );
  }

  async getAppSettings() {
    const rows = await query('SELECT setting_key, setting_value FROM app_settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.setting_key] = r.setting_value;
    });
    return settings;
  }

  async setAppSetting(key, value) {
    await query(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, String(value)]
    );
  }

  // Academic Years
  async getAcademicYears() {
    return await query('SELECT * FROM academic_years ORDER BY id DESC');
  }

  async addAcademicYear(name) {
    await query('INSERT INTO academic_years (name, active) VALUES (?, 0)', [name]);
  }

  async activateAcademicYear(id) {
    await transaction(async (conn) => {
      await conn.query('UPDATE academic_years SET active = 0');
      await conn.query('UPDATE academic_years SET active = 1 WHERE id = ?', [id]);
    });
  }

  async deleteAcademicYear(id) {
    await query('DELETE FROM academic_years WHERE id = ?', [id]);
  }

  // Courses
  async getCourses() {
    return await query('SELECT * FROM courses ORDER BY name');
  }

  async getActiveCourses() {
    return await query('SELECT id, name FROM courses WHERE active = 1 ORDER BY name');
  }

  async getCourseById(id) {
    const rows = await query('SELECT * FROM courses WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async addCourse(name, durationYears) {
    await query('INSERT INTO courses (name, duration_years, active) VALUES (?, ?, 1)', [name, durationYears]);
  }

  async toggleCourse(id) {
    await query('UPDATE courses SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
  }

  async updateCourse(id, name, durationYears) {
    await query('UPDATE courses SET name = ?, duration_years = ? WHERE id = ?', [name, durationYears, id]);
  }

  async deleteCourse(id) {
    await query('DELETE FROM courses WHERE id = ?', [id]);
  }

  async getCourseStudentUsage(courseName) {
    const rows = await query('SELECT COUNT(*) AS count FROM students WHERE course = ?', [courseName]);
    return rows[0].count;
  }
}

module.exports = new SettingsRepository();
