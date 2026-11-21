const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { requireAuth, requireRole } = require('../src/auth');
const { seed, SAMPLE_PASSWORD } = require('../src/seed');

const SECRET = 'test-secret';

describe('Login API', () => {
  let db;
  let app;

  beforeEach(() => {
    db = openDatabase(':memory:');
    seed(db);
    app = createApp(db, { jwtSecret: SECRET });
  });

  afterEach(() => {
    db.close();
  });

  function login(email, password) {
    return request(app).post('/api/auth/login').send({ email, password });
  }

  test('logs in with the right email and password and returns a token and the role', async () => {
    const res = await login('parent@mag.test', SAMPLE_PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'parent@mag.test', role: 'parent' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('takes the role from the account (FR-M1-03)', async () => {
    const res = await login('specialist@mag.test', SAMPLE_PASSWORD);

    expect(jwt.verify(res.body.token, SECRET).role).toBe('specialist');
  });

  test('rejects a wrong password', async () => {
    const res = await login('parent@mag.test', 'wrong-password');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Wrong email or password');
  });

  test('rejects an unknown email with the same message', async () => {
    const res = await login('nobody@mag.test', SAMPLE_PASSWORD);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Wrong email or password');
  });

  test('rejects a login without email or password', async () => {
    const res = await login('parent@mag.test', '');

    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me returns the logged-in user', async () => {
    const { body } = await login('child@mag.test', SAMPLE_PASSWORD);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'child@mag.test', role: 'child' });
  });

  test('GET /api/auth/me rejects a request without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me rejects a token signed with another secret', async () => {
    const fakeToken = jwt.sign({ sub: 1, role: 'parent' }, 'another-secret');

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });

  test('createApp refuses to start without a JWT secret', () => {
    expect(() => createApp(db, { jwtSecret: '' })).toThrow(/JWT_SECRET/);
  });
});

describe('requireRole middleware', () => {
  // A small app with one parent-only route, to test the middleware alone.
  const app = express();
  app.get('/parent-only', requireAuth(SECRET), requireRole('parent'), (req, res) => {
    res.json({ ok: true });
  });

  function tokenFor(role) {
    return jwt.sign({ sub: 1, role }, SECRET);
  }

  test('lets an allowed role through', async () => {
    const res = await request(app).get('/parent-only').set('Authorization', `Bearer ${tokenFor('parent')}`);

    expect(res.status).toBe(200);
  });

  test('rejects another role with 403 (FR-M1-05)', async () => {
    const res = await request(app).get('/parent-only').set('Authorization', `Bearer ${tokenFor('child')}`);

    expect(res.status).toBe(403);
  });
});
