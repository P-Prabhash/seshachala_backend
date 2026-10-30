const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('Health Check Integration Test', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('GET /health returns health status object', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('service', 'seshachala-fee-management');
    expect(res.body).toHaveProperty('database');
  });
});
