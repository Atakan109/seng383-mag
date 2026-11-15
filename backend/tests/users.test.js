const bcrypt = require('bcryptjs');
const { openDatabase } = require('../src/db');
const { seed, sampleUsers, SAMPLE_PASSWORD } = require('../src/seed');

describe('Users and children tables', () => {
  let db;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  test('seed creates one parent, one specialist and one child user', () => {
    seed(db);

    const roles = db.prepare('SELECT role FROM users ORDER BY id').all().map((u) => u.role);

    expect(roles).toEqual(['parent', 'specialist', 'child']);
    expect(roles).toHaveLength(sampleUsers.length);
  });

  test('seed stores passwords as bcrypt hashes, not plain text', () => {
    seed(db);

    const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('parent@mag.test');

    expect(user.password_hash).not.toBe(SAMPLE_PASSWORD);
    expect(bcrypt.compareSync(SAMPLE_PASSWORD, user.password_hash)).toBe(true);
  });

  test('seed links the child record to the parent and to the child account', () => {
    seed(db);

    const child = db
      .prepare(
        `SELECT p.role AS parentRole, c.role AS childRole
         FROM children
         JOIN users p ON p.id = children.parent_id
         JOIN users c ON c.id = children.user_id`
      )
      .get();

    expect(child).toEqual({ parentRole: 'parent', childRole: 'child' });
  });

  test('two users cannot have the same email', () => {
    const insert = db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('A', 'same@mag.test', 'x', 'parent')"
    );
    insert.run();

    expect(() => insert.run()).toThrow(/UNIQUE/);
  });

  test('a user cannot have a role other than parent, specialist or child', () => {
    const insert = db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('A', 'a@mag.test', 'x', 'admin')"
    );

    expect(() => insert.run()).toThrow(/CHECK/);
  });

  test('a child cannot point to a parent that does not exist', () => {
    const insert = db.prepare("INSERT INTO children (parent_id, name) VALUES (999, 'Ghost')");

    expect(() => insert.run()).toThrow(/FOREIGN KEY/);
  });
});
