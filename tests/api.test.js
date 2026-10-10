// These tests do not need a real database: the models are replaced with fakes.
jest.mock('../models/User');
jest.mock('../models/BudgetCategory');
jest.mock('../models/Transaction');

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const BudgetCategory = require('../models/BudgetCategory');
const Transaction = require('../models/Transaction');
const { getMonthRange } = require('../utils/month');

afterEach(() => jest.clearAllMocks());

describe('status, health and metrics', () => {
  test('GET /api/status says the API is running', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/running/);
  });

  test('GET /health returns 503 when the database is not connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
  });

  test('GET /metrics returns Prometheus text', async () => {
    await request(app).get('/api/status');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/http_requests_total/);
  });
});

describe('users', () => {
  test('POST /api/users rejects missing fields', async () => {
    const res = await request(app).post('/api/users').send({ name: 'A' });
    expect(res.status).toBe(400);
  });

  test('POST /api/users creates a user', async () => {
    User.create.mockResolvedValue({ _id: '1', name: 'A', email: 'a@b.com', monthlyIncome: 4000 });
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'A', email: 'a@b.com', monthlyIncome: 4000 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('A');
  });

  test('GET /api/users/:id returns 404 for an unknown user', async () => {
    User.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/users/abc');
    expect(res.status).toBe(404);
  });
});

describe('budget', () => {
  test('POST /categories rejects a negative amount', async () => {
    const res = await request(app)
      .post('/api/budget/categories')
      .send({ userId: '1', name: 'Food', budgetAmount: -5 });
    expect(res.status).toBe(400);
  });

  test('POST /categories creates a category', async () => {
    BudgetCategory.create.mockResolvedValue({ name: 'Food', budgetAmount: 300 });
    const res = await request(app)
      .post('/api/budget/categories')
      .send({ userId: '1', name: 'Food', budgetAmount: 300 });
    expect(res.status).toBe(201);
  });

  test('POST /transactions refuses a category that is not in the budget', async () => {
    BudgetCategory.find.mockResolvedValue([{ name: 'Food' }]);
    const res = await request(app)
      .post('/api/budget/transactions')
      .send({ userId: '1', category: 'Games', amount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not in your budget/);
  });

  test('POST /transactions ignores capital letters in the category', async () => {
    BudgetCategory.find.mockResolvedValue([{ name: 'Food' }]);
    Transaction.create.mockImplementation(async (d) => d);
    const res = await request(app)
      .post('/api/budget/transactions')
      .send({ userId: '1', category: 'food', amount: 10 });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('Food');
  });

  test('GET /summary works out spent, remaining and percent', async () => {
    BudgetCategory.find.mockResolvedValue([{ _id: 'c1', name: 'Food', budgetAmount: 200 }]);
    Transaction.find.mockResolvedValue([
      { category: 'Food', amount: 50 },
      { category: 'Food', amount: 50 },
    ]);
    const res = await request(app).get('/api/budget/summary/1');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ spent: 100, remaining: 100, percentUsed: 50 });
  });

  test('DELETE /categories/:id returns 404 when missing', async () => {
    BudgetCategory.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/budget/categories/x');
    expect(res.status).toBe(404);
  });
});

describe('month helper', () => {
  test('gives the right range for a 30-day month', () => {
    const r = getMonthRange(new Date(2026, 8, 15));
    expect(r.daysInMonth).toBe(30);
    expect(r.start.getDate()).toBe(1);
    expect(r.dayOfMonth).toBe(15);
  });
});
