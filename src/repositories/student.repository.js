const { query, transaction } = require('../config/database');

class StudentRepository {
  async findAll({ search = '', category = '', year = '' }) {
    const conditions = ['1=1'];
    const params = [];

    if (search) {
      const like = `%${search}%`;
      conditions.append ? null : conditions.push(`(
        s.name LIKE ? OR s.admission_no LIKE ? OR s.mobile LIKE ?
        OR s.father_name LIKE ? OR s.course LIKE ?
      )`);
      params.push(like, like, like, like, like);
    }

    if (category) {
      conditions.push("LOWER(TRIM(COALESCE(s.category, ''))) = ?");
      params.push(category.toLowerCase());
    }

    if (year) {
      this._applyYearFilter(year, conditions, params);
    }

    const whereSql = conditions.join(' AND ');

    const sql = `
      SELECT s.*,
             COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0) AS paid,
             s.total_fee - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0) AS balance
      FROM students s
      WHERE ${whereSql}
      ORDER BY s.id DESC
    `;

    return await query(sql, params);
  }

  async findTotals({ search = '', category = '', year = '' }) {
    const conditions = ['1=1'];
    const params = [];

    if (search) {
      const like = `%${search}%`;
      conditions.push(`(
        s.name LIKE ? OR s.admission_no LIKE ? OR s.mobile LIKE ?
        OR s.father_name LIKE ? OR s.course LIKE ?
      )`);
      params.push(like, like, like, like, like);
    }

    if (category) {
      conditions.push("LOWER(TRIM(COALESCE(s.category, ''))) = ?");
      params.push(category.toLowerCase());
    }

    if (year) {
      this._applyYearFilter(year, conditions, params);
    }

    const whereSql = conditions.join(' AND ');

    const [rows] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN s.active = 1 THEN 1 ELSE 0 END) AS active,
        COALESCE(SUM(s.total_fee), 0) AS fee,
        COALESCE(SUM(s.total_fee - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0)), 0) AS outstanding
      FROM students s
      WHERE ${whereSql}
    `, params);

    return {
      total: parseInt(rows.total || 0, 10),
      active: parseInt(rows.active || 0, 10),
      fee: parseFloat(rows.fee || 0),
      outstanding: parseFloat(rows.outstanding || 0)
    };
  }

  async findById(id) {
    const rows = await query(`
      SELECT s.*,
             COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id), 0) AS paid
      FROM students s
      WHERE s.id = ?
      LIMIT 1
    `, [id]);
    return rows[0] || null;
  }

  async findByAdmissionNo(admissionNo, excludeId = null) {
    let sql = 'SELECT id FROM students WHERE admission_no = ?';
    const params = [admissionNo];
    if (excludeId) {
      sql += ' AND id <> ?';
      params.push(excludeId);
    }
    const rows = await query(sql, params);
    return rows[0] || null;
  }

  async createStudentWithComponents(studentData, selectedComponents) {
    return await transaction(async (conn) => {
      const [res] = await conn.query(
        `INSERT INTO students
         (admission_no, name, category, father_name, mobile, email, aadhaar_number, course, year_sem, admission_date, address, total_fee, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentData.admissionNo,
          studentData.name,
          studentData.category,
          studentData.fatherName || null,
          studentData.mobile || null,
          studentData.email || null,
          studentData.aadhaarNumber || null,
          studentData.course,
          studentData.yearSem,
          studentData.admissionDate || null,
          studentData.address || null,
          studentData.totalFee,
          studentData.photo || null
        ]
      );

      const studentId = res.insertId;

      for (const comp of selectedComponents) {
        await conn.query(
          `INSERT INTO student_fee_components (student_id, field_key, label, amount)
           VALUES (?, ?, ?, ?)`,
          [studentId, comp.field, comp.label, comp.amount]
        );
      }

      return studentId;
    });
  }

  async updateStudentWithComponents(id, studentData, selectedComponents) {
    return await transaction(async (conn) => {
      await conn.query(
        `UPDATE students
         SET admission_no = ?, name = ?, category = ?, father_name = ?,
             mobile = ?, aadhaar_number = ?, course = ?, year_sem = ?,
             admission_date = ?, address = ?, total_fee = ?, photo = ?
         WHERE id = ?`,
        [
          studentData.admissionNo,
          studentData.name,
          studentData.category,
          studentData.fatherName || null,
          studentData.mobile || null,
          studentData.aadhaarNumber || null,
          studentData.course,
          studentData.yearSem,
          studentData.admissionDate || null,
          studentData.address || null,
          studentData.totalFee,
          studentData.photo,
          id
        ]
      );

      await conn.query('DELETE FROM student_fee_components WHERE student_id = ?', [id]);

      for (const comp of selectedComponents) {
        await conn.query(
          `INSERT INTO student_fee_components (student_id, field_key, label, amount)
           VALUES (?, ?, ?, ?)`,
          [id, comp.field, comp.label, comp.amount]
        );
      }
    });
  }

  async deleteStudent(id, auditData = null) {
    return await transaction(async (conn) => {
      const [rows] = await conn.query('SELECT id, name, admission_no FROM students WHERE id = ?', [id]);
      if (rows.length === 0) return false;
      const student = rows[0];

      await conn.query('DELETE FROM payments WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM caution_deposits WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM refunds WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM student_fee_components WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM students WHERE id = ?', [id]);

      if (auditData) {
        const auditMsg = `Deleted student: ${student.name} (${student.admission_no})`;
        await conn.query(
          `INSERT INTO audit_logs (action, module, entity, entity_id, record_id, description, details, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['DELETE', 'students', 'students', id, id, auditMsg, auditMsg, auditData.userId || null]
        );
      }

      return student;
    });
  }

  async getFeeComponents(studentId) {
    return await query(
      'SELECT field_key, label, amount FROM student_fee_components WHERE student_id = ? ORDER BY id',
      [studentId]
    );
  }

  _applyYearFilter(year, conditions, params) {
    if (year === '1st Year') {
      conditions.push(`(
        LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%1st%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%first%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '1'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '1 year'
      )`);
    } else if (year === '2nd Year') {
      conditions.push(`(
        LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%2nd%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%second%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '2'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '2 year'
      )`);
    } else if (year === '3rd Year') {
      conditions.push(`(
        LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%3rd%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%third%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '3'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '3 year'
      )`);
    } else if (year === '4th Year') {
      conditions.push(`(
        LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%4th%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) LIKE '%fourth%'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '4'
        OR LOWER(TRIM(COALESCE(s.year_sem, ''))) = '4 year'
      )`);
    } else if (year === 'Old') {
      conditions.push(`(
        s.year_sem IS NULL OR TRIM(s.year_sem) = ''
        OR (
          LOWER(TRIM(s.year_sem)) NOT LIKE '%1st%'
          AND LOWER(TRIM(s.year_sem)) NOT LIKE '%first%'
          AND LOWER(TRIM(s.year_sem)) NOT LIKE '%2nd%'
          AND LOWER(TRIM(s.year_sem)) NOT LIKE '%second%'
          AND LOWER(TRIM(s.year_sem)) NOT LIKE '%3rd%'
          AND LOWER(TRIM(s.year_sem)) NOT LIKE '%third%'
          AND LOWER(TRIM(s.year_sem)) NOT LIKE '%4th%'
          AND LOWER(TRIM(s.year_sem)) NOT LIKE '%fourth%'
        )
      )`);
    }
  }
}

module.exports = new StudentRepository();
