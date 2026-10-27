const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { seed, sampleTasks } = require('../src/seed');

describe('Walking skeleton API', () => {
  let db;
  let app;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /api/tasks returns the seeded tasks from the database', async () => {
    seed(db);

    const res = await request(app).get('/api/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(sampleTasks.length);
    expect(res.body[0]).toMatchObject({
      title: 'Read for 20 minutes',
      developmentArea: 'Language',
      status: 'pending',
    });
  });

  test('GET /api/tasks returns an empty list when there are no tasks', async () => {
    const res = await request(app).get('/api/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
