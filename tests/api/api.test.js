const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('API Integration Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('POST /api/contact validates payload', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({
        name: '',
        email: 'invalid-email',
        message: ''
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
