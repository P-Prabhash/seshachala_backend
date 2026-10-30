const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function seed() {
  logger.info('Starting database seeding...');

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  await transaction(async (connection) => {
    // 1. Admin User
    const [adminRows] = await connection.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (adminRows.length === 0) {
      await connection.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        ['admin', 'admin@seshachala.edu', adminPasswordHash, 'Administrator', 'Admin']
      );
      logger.info('Created default Admin user.');
    }

    // 2. Staff User
    const [staffUserRows] = await connection.query('SELECT id FROM users WHERE username = ?', ['staff']);
    let staffUserId;
    if (staffUserRows.length === 0) {
      const [res] = await connection.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        ['staff', 'staff@seshachala.edu', staffPasswordHash, 'Staff User', 'Staff']
      );
      staffUserId = res.insertId;
      logger.info('Created default Staff user.');
    } else {
      staffUserId = staffUserRows[0].id;
    }

    // 3. Staff Table Record
    const [staffRows] = await connection.query('SELECT id FROM staff WHERE username = ?', ['staff']);
    if (staffRows.length === 0) {
      await connection.query(
        `INSERT INTO staff (user_id, name, username, email, role, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [staffUserId, 'Staff User', 'staff', 'staff@seshachala.edu', 'Staff', 'Active', staffPasswordHash]
      );
      logger.info('Created default Staff table entry.');
    }

    // 4. Academic Year
    const [ayRows] = await connection.query('SELECT COUNT(*) as count FROM academic_years');
    if (ayRows[0].count === 0) {
      await connection.query(
        'INSERT INTO academic_years (name, active) VALUES (?, 1)',
        ['2026–27']
      );
      logger.info('Seeded default academic year 2026–27.');
    }

    // 5. Course
    const [courseRows] = await connection.query('SELECT COUNT(*) as count FROM courses');
    if (courseRows[0].count === 0) {
      await connection.query(
        'INSERT INTO courses (name, duration_years, active) VALUES (?, 4, 1)',
        ['B.Pharm']
      );
      logger.info('Seeded default course B.Pharm.');
    }

    // 6. College Settings
    const [collegeRows] = await connection.query('SELECT id FROM college_settings WHERE id = 1');
    if (collegeRows.length === 0) {
      await connection.query(
        `INSERT INTO college_settings (id, college_name, subtitle, logo_path)
         VALUES (1, ?, ?, ?)`,
        ['Seshachala', 'College of Pharmacy', '/static/images/logo.png']
      );
      logger.info('Seeded default college settings.');
    }

    // 7. App Settings
    const settingDefaults = {
      fee_types: 'Tuition Fee,Exam Fee,Lab Fee,Hostel Fee,Transport Fee,Other Fee',
      default_installments: '1',
      late_fee_amount: '0',
      max_discount_percent: '0',
      receipt_prefix: 'SCP',
      receipt_header: 'Seshachala College of Pharmacy',
      receipt_footer: 'Thank you for your payment.',
      signature_label: 'Authorized Signature',
      receipt_logo_path: '/static/images/logo.png',
      payment_modes: 'Cash,UPI,Card,Check'
    };

    for (const [key, value] of Object.entries(settingDefaults)) {
      await connection.query(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
    }
  });

  // Check if existing SQLite database exists and import data if SQLite data is present
  const sqliteDbPath = path.join(__dirname, '../../data/seshachala_fee_management.db');
  if (fs.existsSync(sqliteDbPath)) {
    try {
      const sqlite3 = require('sqlite3');
      logger.info('Found existing SQLite database. Transferring data to MySQL...');
      await migrateDataFromSqlite(sqliteDbPath, adminPasswordHash);
    } catch (err) {
      logger.warn('SQLite import skipped or failed: %s', err.message);
    }
  }

  logger.info('Database seeding completed successfully.');
}

async function migrateDataFromSqlite(dbPath, defaultAdminHash) {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(dbPath);

  const getSqliteRows = (sql) => new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

  try {
    // Import Students
    const students = await getSqliteRows('SELECT * FROM students');
    for (const s of students) {
      await query(
        `INSERT INTO students (id, admission_no, name, category, father_name, mobile, email, aadhaar_number, course, year_sem, admission_date, address, total_fee, active, photo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name=VALUES(name), category=VALUES(category), father_name=VALUES(father_name),
           mobile=VALUES(mobile), email=VALUES(email), aadhaar_number=VALUES(aadhaar_number),
           course=VALUES(course), year_sem=VALUES(year_sem), total_fee=VALUES(total_fee), photo=VALUES(photo)`,
        [
          s.id, s.admission_no, s.name, s.category || 'Convener', s.father_name,
          s.mobile, s.email, s.aadhaar_number, s.course || 'B.Pharm', s.year_sem || '1st Year',
          s.admission_date || null, s.address, s.total_fee || 0, s.active !== undefined ? s.active : 1,
          s.photo || null, s.created_at || new Date().toISOString()
        ]
      );
    }
    if (students.length > 0) logger.info(`Migrated ${students.length} student records from SQLite.`);

    // Import Payments
    const payments = await getSqliteRows('SELECT * FROM payments');
    for (const p of payments) {
      await query(
        `INSERT INTO payments (id, student_id, receipt_no, amount, payment_mode, payment_date, notes, collected_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount), payment_mode=VALUES(payment_mode), payment_date=VALUES(payment_date)`,
        [
          p.id, p.student_id, p.receipt_no, p.amount, p.payment_mode || 'Cash',
          p.payment_date, p.notes, p.collected_by || null, p.created_at || new Date().toISOString()
        ]
      );
    }
    if (payments.length > 0) logger.info(`Migrated ${payments.length} payment records from SQLite.`);

    // Import Fee Components
    const feeComps = await getSqliteRows('SELECT * FROM student_fee_components');
    for (const fc of feeComps) {
      await query(
        `INSERT INTO student_fee_components (id, student_id, field_key, label, amount)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
        [fc.id, fc.student_id, fc.field_key, fc.label, fc.amount]
      );
    }

    // Import Caution Deposits
    const caution = await getSqliteRows('SELECT * FROM caution_deposits');
    for (const c of caution) {
      await query(
        `INSERT INTO caution_deposits (id, student_id, receipt_no, amount, payment_mode, reference, deposit_date, notes, collected_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
        [c.id, c.student_id, c.receipt_no, c.amount, c.payment_mode || 'Cash', c.reference || null, c.deposit_date, c.notes || null, c.collected_by || null, c.created_at || new Date().toISOString()]
      );
    }

    // Import Refunds
    const refunds = await getSqliteRows('SELECT * FROM refunds');
    for (const r of refunds) {
      await query(
        `INSERT INTO refunds (id, student_id, receipt_no, amount, payment_mode, reference, refund_date, notes, collected_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
        [r.id, r.student_id, r.receipt_no, r.amount, r.payment_mode || 'Cash', r.reference || null, r.refund_date, r.notes || null, r.collected_by || null, r.created_at || new Date().toISOString()]
      );
    }

  } finally {
    db.close();
  }
}

if (require.main === module) {
  seed().catch(err => {
    logger.error('Seeding failed: %s', err.stack || err.message);
    process.exit(1);
  });
}

module.exports = seed;
