const request = require('supertest');
const bcrypt = require('bcryptjs');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { createToken } = require('../src/auth');

const JWT_SECRET = 'test-secret';

describe('M3 Events API (/api/children/:childId/events)', () => {
  let db;
  let app;
  let parent;
  let otherParent;
  let specialist;
  let unlinkedSpecialist;
  let childUser;
  let child;
  let otherChild;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp(db, { jwtSecret: JWT_SECRET });
    const hash = bcrypt.hashSync('pass123', 4);

    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );

    parent = {
      id: insertUser.run('Ayse Parent', 'parent@test.com', hash, 'parent').lastInsertRowid,
      role: 'parent',
    };
    otherParent = {
      id: insertUser.run('Mehmet Other', 'other@test.com', hash, 'parent').lastInsertRowid,
      role: 'parent',
    };
    specialist = {
      id: insertUser.run('Dr. Can', 'spec@test.com', hash, 'specialist').lastInsertRowid,
      role: 'specialist',
    };
    unlinkedSpecialist = {
      id: insertUser.run('Dr. Zeynep', 'unlinked@test.com', hash, 'specialist').lastInsertRowid,
      role: 'specialist',
    };
    childUser = {
      id: insertUser.run('Deniz Child', 'child@test.com', hash, 'child').lastInsertRowid,
      role: 'child',
    };

    const insertChild = db.prepare(
      'INSERT INTO children (parent_id, user_id, name) VALUES (?, ?, ?)'
    );
    child = {
      id: insertChild.run(parent.id, childUser.id, 'Deniz').lastInsertRowid,
    };
    otherChild = {
      id: insertChild.run(otherParent.id, null, 'Ege').lastInsertRowid,
    };

    db.prepare(
      'INSERT INTO specialist_links (child_id, specialist_id, specialist_type) VALUES (?, ?, ?)'
    ).run(child.id, specialist.id, 'Psychologist');
  });

  afterEach(() => {
    db.close();
  });

  function authHeader(user) {
    return { Authorization: `Bearer ${createToken(user, JWT_SECRET)}` };
  }

  test('parent and linked specialist can create events (FR-M3-01)', async () => {
    const res1 = await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(parent))
      .send({
        title: 'Yüzme antrenmanı',
        startsAt: '2026-11-24T17:30',
        endsAt: '2026-11-24T18:30',
        eventType: 'sport',
      });

    expect(res1.status).toBe(201);
    expect(res1.body).toMatchObject({
      childId: Number(child.id),
      createdBy: Number(parent.id),
      title: 'Yüzme antrenmanı',
      startsAt: '2026-11-24T17:30',
      endsAt: '2026-11-24T18:30',
      eventType: 'sport',
    });

    const res2 = await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(specialist))
      .send({
        title: 'Psikolog görüşmesi',
        date: '2026-11-25',
        startTime: '16:00',
        endTime: '16:45',
        eventType: 'therapy',
      });

    expect(res2.status).toBe(201);
    expect(res2.body.startsAt).toBe('2026-11-25T16:00');
  });

  test('rejects event creation when required fields are missing (FR-M3-02)', async () => {
    const res = await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(parent))
      .send({ title: 'Eksik saatli etkinlik', startsAt: '2026-11-24T10:00' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('rejects event creation from child or unlinked specialist', async () => {
    const childRes = await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(childUser))
      .send({
        title: 'Child event',
        startsAt: '2026-11-24T10:00',
        endsAt: '2026-11-24T11:00',
      });
    expect(childRes.status).toBe(403);

    const unlinkedRes = await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(unlinkedSpecialist))
      .send({
        title: 'Unlinked event',
        startsAt: '2026-11-24T10:00',
        endsAt: '2026-11-24T11:00',
      });
    expect(unlinkedRes.status).toBe(403);
  });

  test('lists events filtered by child and ?week=YYYY-MM-DD (FR-M3-03, FR-M3-04, FR-M3-06)', async () => {
    await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(parent))
      .send({
        title: 'Hafta içi ders',
        startsAt: '2026-11-24T15:00',
        endsAt: '2026-11-24T16:00',
      });

    await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(specialist))
      .send({
        title: 'Gelecek hafta',
        startsAt: '2026-12-02T14:00',
        endsAt: '2026-12-02T15:00',
      });

    // Event belonging to another child must not appear
    await request(app)
      .post(`/api/children/${otherChild.id}/events`)
      .set(authHeader(otherParent))
      .send({
        title: 'Ege etkinliği',
        startsAt: '2026-11-24T12:00',
        endsAt: '2026-11-24T13:00',
      });

    const childList = await request(app)
      .get(`/api/children/${child.id}/events`)
      .set(authHeader(childUser));
    expect(childList.status).toBe(200);
    expect(childList.body).toHaveLength(2);

    const filteredList = await request(app)
      .get(`/api/children/${child.id}/events?week=2026-11-23`)
      .set(authHeader(parent));
    expect(filteredList.status).toBe(200);
    expect(filteredList.body).toHaveLength(1);
    expect(filteredList.body[0].title).toBe('Hafta içi ders');
  });

  test('only the event creator can edit or delete an event (FR-M3-05)', async () => {
    const created = await request(app)
      .post(`/api/children/${child.id}/events`)
      .set(authHeader(parent))
      .send({
        title: 'İlk başlık',
        startsAt: '2026-11-24T09:00',
        endsAt: '2026-11-24T10:00',
      });

    const eventId = created.body.id;

    // Linked specialist cannot edit parent's event
    const forbiddenEdit = await request(app)
      .put(`/api/children/${child.id}/events/${eventId}`)
      .set(authHeader(specialist))
      .send({
        title: 'Değişen başlık',
        startsAt: '2026-11-24T09:00',
        endsAt: '2026-11-24T10:00',
      });
    expect(forbiddenEdit.status).toBe(403);

    // Creator (parent) can edit
    const okEdit = await request(app)
      .put(`/api/children/${child.id}/events/${eventId}`)
      .set(authHeader(parent))
      .send({
        title: 'Güncel başlık',
        startsAt: '2026-11-24T10:00',
        endsAt: '2026-11-24T11:00',
        eventType: 'education',
      });
    expect(okEdit.status).toBe(200);
    expect(okEdit.body.title).toBe('Güncel başlık');
    expect(okEdit.body.startsAt).toBe('2026-11-24T10:00');

    // Linked specialist cannot delete parent's event
    const forbiddenDelete = await request(app)
      .delete(`/api/children/${child.id}/events/${eventId}`)
      .set(authHeader(specialist));
    expect(forbiddenDelete.status).toBe(403);

    // Creator (parent) can delete
    const okDelete = await request(app)
      .delete(`/api/children/${child.id}/events/${eventId}`)
      .set(authHeader(parent));
    expect(okDelete.status).toBe(204);
  });
});
