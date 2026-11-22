const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { createToken } = require('../src/auth');
const { seed, sampleTasks } = require('../src/seed');

const SECRET = 'test-secret';

describe('Task API under /api/children/:childId/tasks', () => {
  let db;
  let app;
  let childId;
  let otherChildId;

  // Returns a token for a user, as if the user had logged in.
  function tokenFor(email) {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return `Bearer ${createToken(user, SECRET)}`;
  }

  function addUser(email, role) {
    return db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Extra', ?, 'x', ?)")
      .run(email, role).lastInsertRowid;
  }

  const tasksUrl = (id = childId) => `/api/children/${id}/tasks`;

  const newTask = {
    title: 'Draw a family picture',
    description: 'Use at least three colours.',
    developmentArea: 'Motor',
    dueDate: '2026-11-27',
  };

  beforeEach(() => {
    db = openDatabase(':memory:');
    seed(db);
    app = createApp(db, { jwtSecret: SECRET });
    childId = db.prepare('SELECT id FROM children').get().id;

    // A specialist who is not linked, and another family with one child and one task.
    addUser('specialist2@mag.test', 'specialist');
    const otherParentId = addUser('otherparent@mag.test', 'parent');
    otherChildId = db
      .prepare('INSERT INTO children (parent_id, name) VALUES (?, ?)')
      .run(otherParentId, 'Other Child').lastInsertRowid;
    db.prepare(
      "INSERT INTO tasks (title, development_area, due_date, child_id, assigned_by) VALUES ('Other task', 'Motor', '2026-11-20', ?, ?)"
    ).run(otherChildId, otherParentId);
  });

  afterEach(() => {
    db.close();
  });

  describe('GET (list the child\'s tasks)', () => {
    test.each([
      ['the parent (FR-M4-06)', 'parent@mag.test'],
      ['the child (FR-M4-03)', 'child@mag.test'],
      ['a linked specialist', 'specialist@mag.test'],
    ])('%s sees all tasks of the child with their status', async (who, email) => {
      const res = await request(app).get(tasksUrl()).set('Authorization', tokenFor(email));

      expect(res.status).toBe(200);
      expect(res.body.map((task) => task.title)).toEqual(sampleTasks.map((task) => task.title));
      expect(res.body.every((task) => task.childId === childId && task.status === 'pending')).toBe(true);
    });

    test('shows who assigned each task', async () => {
      const res = await request(app).get(tasksUrl()).set('Authorization', tokenFor('parent@mag.test'));

      expect(res.body[0].assignedBy).toMatchObject({ name: 'Demo Parent' });
      expect(res.body[1].assignedBy).toMatchObject({ name: 'Demo Specialist' });
    });

    test('does not include tasks of other children', async () => {
      const res = await request(app).get(tasksUrl()).set('Authorization', tokenFor('parent@mag.test'));

      expect(res.body.map((task) => task.title)).not.toContain('Other task');
    });

    test.each([
      ['a specialist who is not linked', 'specialist2@mag.test'],
      ['the parent of another family', 'otherparent@mag.test'],
    ])('%s gets 403', async (who, email) => {
      const res = await request(app).get(tasksUrl()).set('Authorization', tokenFor(email));

      expect(res.status).toBe(403);
    });

    test('needs a login', async () => {
      const res = await request(app).get(tasksUrl());

      expect(res.status).toBe(401);
    });

    test('returns 404 for a child that does not exist', async () => {
      const res = await request(app).get(tasksUrl(999)).set('Authorization', tokenFor('parent@mag.test'));

      expect(res.status).toBe(404);
    });
  });

  describe('POST (assign a task)', () => {
    test.each([
      ['the parent', 'parent@mag.test', 'Demo Parent'],
      ['a linked specialist', 'specialist@mag.test', 'Demo Specialist'],
    ])('%s assigns a task to the child (FR-M4-01)', async (who, email, assignerName) => {
      const res = await request(app).post(tasksUrl()).set('Authorization', tokenFor(email)).send(newTask);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        ...newTask,
        childId,
        status: 'pending',
        assignedBy: { name: assignerName },
      });

      const list = await request(app).get(tasksUrl()).set('Authorization', tokenFor('child@mag.test'));
      expect(list.body.map((task) => task.title)).toContain(newTask.title);
    });

    test('a task without a description is accepted', async () => {
      const { description, ...withoutDescription } = newTask;

      const res = await request(app)
        .post(tasksUrl())
        .set('Authorization', tokenFor('parent@mag.test'))
        .send(withoutDescription);

      expect(res.status).toBe(201);
      expect(res.body.description).toBeNull();
    });

    test.each(['title', 'developmentArea', 'dueDate'])(
      'rejects a task without %s (FR-M4-02)',
      async (field) => {
        const res = await request(app)
          .post(tasksUrl())
          .set('Authorization', tokenFor('parent@mag.test'))
          .send({ ...newTask, [field]: '  ' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Title, development area and due date are required');
      }
    );

    test.each(['27.11.2026', '2026-02-30'])('rejects the due date %s', async (dueDate) => {
      const res = await request(app)
        .post(tasksUrl())
        .set('Authorization', tokenFor('parent@mag.test'))
        .send({ ...newTask, dueDate });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Due date must be a valid date (YYYY-MM-DD)');
    });

    test('a child cannot assign tasks', async () => {
      const res = await request(app).post(tasksUrl()).set('Authorization', tokenFor('child@mag.test')).send(newTask);

      expect(res.status).toBe(403);
    });

    test('a specialist who is not linked cannot assign tasks', async () => {
      const res = await request(app)
        .post(tasksUrl())
        .set('Authorization', tokenFor('specialist2@mag.test'))
        .send(newTask);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH (mark a task as done)', () => {
    const taskUrl = (taskId, id = childId) => `${tasksUrl(id)}/${taskId}`;
    const firstTaskId = () => db.prepare('SELECT id FROM tasks WHERE child_id = ? ORDER BY id').get(childId).id;

    test('the child marks their task as done and the assigner sees it (FR-M4-04, FR-M4-05)', async () => {
      const res = await request(app)
        .patch(taskUrl(firstTaskId()))
        .set('Authorization', tokenFor('child@mag.test'))
        .send({ status: 'done' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');

      const list = await request(app).get(tasksUrl()).set('Authorization', tokenFor('parent@mag.test'));
      expect(list.body.find((task) => task.id === firstTaskId()).status).toBe('done');
    });

    test('only "done" is accepted as a new status', async () => {
      const res = await request(app)
        .patch(taskUrl(firstTaskId()))
        .set('Authorization', tokenFor('child@mag.test'))
        .send({ status: 'pending' });

      expect(res.status).toBe(400);
    });

    test.each([
      ['the parent', 'parent@mag.test'],
      ['a linked specialist', 'specialist@mag.test'],
    ])('%s cannot mark a task as done', async (who, email) => {
      const res = await request(app)
        .patch(taskUrl(firstTaskId()))
        .set('Authorization', tokenFor(email))
        .send({ status: 'done' });

      expect(res.status).toBe(403);
    });

    test('the child cannot change a task of another child', async () => {
      const otherTaskId = db.prepare('SELECT id FROM tasks WHERE child_id = ?').get(otherChildId).id;

      const viaOwnChild = await request(app)
        .patch(taskUrl(otherTaskId))
        .set('Authorization', tokenFor('child@mag.test'))
        .send({ status: 'done' });
      const viaOtherChild = await request(app)
        .patch(taskUrl(otherTaskId, otherChildId))
        .set('Authorization', tokenFor('child@mag.test'))
        .send({ status: 'done' });

      expect(viaOwnChild.status).toBe(404);
      expect(viaOtherChild.status).toBe(403);
    });

    test('returns 404 for a task that does not exist', async () => {
      const res = await request(app)
        .patch(taskUrl(999))
        .set('Authorization', tokenFor('child@mag.test'))
        .send({ status: 'done' });

      expect(res.status).toBe(404);
    });
  });
});

describe('Upgrading an older tasks table', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-db-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('openDatabase adds child_id and assigned_by and keeps existing tasks', () => {
    const file = path.join(dir, 'old.db');
    const oldDb = new Database(file);
    oldDb.exec(`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        development_area TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
      );
      INSERT INTO tasks (title) VALUES ('Old task');
    `);
    oldDb.close();

    const db = openDatabase(file);
    const columns = db.prepare('PRAGMA table_info(tasks)').all().map((column) => column.name);
    const titles = db.prepare('SELECT title FROM tasks').all().map((task) => task.title);
    db.close();

    expect(columns).toEqual(expect.arrayContaining(['child_id', 'assigned_by']));
    expect(titles).toEqual(['Old task']);
  });
});
