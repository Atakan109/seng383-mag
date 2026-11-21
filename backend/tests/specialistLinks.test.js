const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { createToken } = require('../src/auth');
const { seed } = require('../src/seed');

const SECRET = 'test-secret';

describe('Children and specialist links API', () => {
  let db;
  let app;
  let childId;

  // Returns a token for a seeded user, as if the user had logged in.
  function tokenFor(email) {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return `Bearer ${createToken(user, SECRET)}`;
  }

  function addUser(email, role) {
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Extra', ?, 'x', ?)"
    ).run(email, role);
  }

  beforeEach(() => {
    db = openDatabase(':memory:');
    seed(db);
    app = createApp(db, { jwtSecret: SECRET });
    childId = db.prepare('SELECT id FROM children').get().id;
    // A second specialist who is not linked, and a parent of another family.
    addUser('specialist2@mag.test', 'specialist');
    addUser('otherparent@mag.test', 'parent');
  });

  afterEach(() => {
    db.close();
  });

  describe('GET /api/children', () => {
    test('a parent sees their own children', async () => {
      const res = await request(app).get('/api/children').set('Authorization', tokenFor('parent@mag.test'));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: childId, name: 'Demo Child' }]);
    });

    test('a specialist sees the children they are linked to (FR-M2-06)', async () => {
      const res = await request(app).get('/api/children').set('Authorization', tokenFor('specialist@mag.test'));

      expect(res.body).toEqual([{ id: childId, name: 'Demo Child', specialistType: 'Speech therapist' }]);
    });

    test('a specialist with no links sees an empty list', async () => {
      const res = await request(app).get('/api/children').set('Authorization', tokenFor('specialist2@mag.test'));

      expect(res.body).toEqual([]);
    });

    test('needs a login', async () => {
      const res = await request(app).get('/api/children');

      expect(res.status).toBe(401);
    });
  });

  describe('linking and unlinking', () => {
    const url = () => `/api/children/${childId}/specialists`;

    test('a parent lists the linked specialists with name, email and type (FR-M2-03)', async () => {
      const res = await request(app).get(url()).set('Authorization', tokenFor('parent@mag.test'));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        name: 'Demo Specialist',
        email: 'specialist@mag.test',
        specialistType: 'Speech therapist',
      });
    });

    test('a parent links a registered specialist by email and type (FR-M2-01)', async () => {
      const res = await request(app)
        .post(url())
        .set('Authorization', tokenFor('parent@mag.test'))
        .send({ email: 'specialist2@mag.test', specialistType: 'Psychologist' });

      expect(res.status).toBe(201);
      const list = await request(app).get(url()).set('Authorization', tokenFor('parent@mag.test'));
      expect(list.body.map((s) => s.email)).toContain('specialist2@mag.test');
    });

    test('rejects an email that is not a registered specialist (FR-M2-02)', async () => {
      const res = await request(app)
        .post(url())
        .set('Authorization', tokenFor('parent@mag.test'))
        .send({ email: 'otherparent@mag.test', specialistType: 'Psychologist' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No registered specialist with this email');
    });

    test('rejects a link without email or type', async () => {
      const res = await request(app)
        .post(url())
        .set('Authorization', tokenFor('parent@mag.test'))
        .send({ email: 'specialist2@mag.test' });

      expect(res.status).toBe(400);
    });

    test('rejects linking the same specialist twice', async () => {
      const res = await request(app)
        .post(url())
        .set('Authorization', tokenFor('parent@mag.test'))
        .send({ email: 'specialist@mag.test', specialistType: 'Speech therapist' });

      expect(res.status).toBe(409);
    });

    test('a specialist cannot link other specialists', async () => {
      const res = await request(app)
        .post(url())
        .set('Authorization', tokenFor('specialist@mag.test'))
        .send({ email: 'specialist2@mag.test', specialistType: 'Psychologist' });

      expect(res.status).toBe(403);
    });

    test('the parent of another family cannot see this child', async () => {
      const res = await request(app).get(url()).set('Authorization', tokenFor('otherparent@mag.test'));

      expect(res.status).toBe(403);
    });

    test('returns 404 for a child that does not exist', async () => {
      const res = await request(app)
        .get('/api/children/999/specialists')
        .set('Authorization', tokenFor('parent@mag.test'));

      expect(res.status).toBe(404);
    });

    test('after unlinking, the specialist loses access at once (FR-M2-04, FR-M2-05)', async () => {
      const specialistId = db.prepare("SELECT id FROM users WHERE email = 'specialist@mag.test'").get().id;
      const specialistToken = tokenFor('specialist@mag.test');

      const unlink = await request(app)
        .delete(`${url()}/${specialistId}`)
        .set('Authorization', tokenFor('parent@mag.test'));
      expect(unlink.status).toBe(204);

      // The same token is still valid, but the specialist is no longer linked.
      const list = await request(app).get('/api/children').set('Authorization', specialistToken);
      expect(list.body).toEqual([]);
    });

    test('unlinking a specialist who is not linked returns 404', async () => {
      const res = await request(app)
        .delete(`${url()}/999`)
        .set('Authorization', tokenFor('parent@mag.test'));

      expect(res.status).toBe(404);
    });
  });
});

describe('childAccess middleware', () => {
  // A small app with one child route, to test who may see a child.
  const express = require('express');
  const { requireAuth } = require('../src/auth');
  const { childAccess } = require('../src/childAccess');

  let db;
  let app;
  let childId;

  function tokenFor(email) {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return `Bearer ${createToken(user, SECRET)}`;
  }

  beforeEach(() => {
    db = openDatabase(':memory:');
    seed(db);
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Extra', 'specialist2@mag.test', 'x', 'specialist')"
    ).run();
    childId = db.prepare('SELECT id FROM children').get().id;
    app = express();
    app.get('/children/:childId/test', requireAuth(SECRET), childAccess(db), (req, res) => {
      res.json({ childName: req.child.name });
    });
  });

  afterEach(() => {
    db.close();
  });

  test.each([
    ['the parent', 'parent@mag.test', 200],
    ['the child', 'child@mag.test', 200],
    ['a linked specialist', 'specialist@mag.test', 200],
    ['a specialist who is not linked', 'specialist2@mag.test', 403],
  ])('%s gets status %i', async (who, email, status) => {
    const res = await request(app).get(`/children/${childId}/test`).set('Authorization', tokenFor(email));

    expect(res.status).toBe(status);
  });
});
