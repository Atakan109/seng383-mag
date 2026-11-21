const bcrypt = require('bcryptjs');
const { openDatabase } = require('./db');

// Synthetic sample data only. No real personal data.

// Test-only password shared by all sample users. Never use it for a real account.
const SAMPLE_PASSWORD = 'mag-demo-123';

const sampleUsers = [
  { name: 'Demo Parent', email: 'parent@mag.test', role: 'parent' },
  { name: 'Demo Specialist', email: 'specialist@mag.test', role: 'specialist' },
  { name: 'Demo Child', email: 'child@mag.test', role: 'child' },
];

const sampleTasks = [
  {
    title: 'Read for 20 minutes',
    description: 'Read one chapter of a book.',
    developmentArea: 'Language',
    dueDate: '2026-11-02',
  },
  {
    title: 'Practice counting to 50',
    description: 'Count objects at home out loud.',
    developmentArea: 'Cognitive',
    dueDate: '2026-11-03',
  },
  {
    title: 'Play catch for 10 minutes',
    description: 'Throw and catch a soft ball with a parent.',
    developmentArea: 'Motor',
    dueDate: '2026-11-04',
  },
];

// Replaces all users, children and tasks with the sample data.
function seed(db) {
  // Links point to children and users, and children point to users,
  // so they are deleted in this order.
  db.prepare('DELETE FROM specialist_links').run();
  db.prepare('DELETE FROM children').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM tasks').run();

  // Passwords are stored only as bcrypt hashes, never as plain text.
  const passwordHash = bcrypt.hashSync(SAMPLE_PASSWORD, 10);
  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (@name, @email, @passwordHash, @role)`
  );
  const userIds = {};
  for (const user of sampleUsers) {
    const result = insertUser.run({ ...user, passwordHash });
    userIds[user.role] = result.lastInsertRowid;
  }

  const child = db.prepare('INSERT INTO children (parent_id, user_id, name) VALUES (?, ?, ?)').run(
    userIds.parent,
    userIds.child,
    'Demo Child'
  );

  db.prepare(
    'INSERT INTO specialist_links (child_id, specialist_id, specialist_type) VALUES (?, ?, ?)'
  ).run(child.lastInsertRowid, userIds.specialist, 'Speech therapist');

  const insertTask = db.prepare(
    `INSERT INTO tasks (title, description, development_area, due_date)
     VALUES (@title, @description, @developmentArea, @dueDate)`
  );
  for (const task of sampleTasks) {
    insertTask.run(task);
  }
}

// Runs only with `npm run seed`, not when the file is imported.
if (require.main === module) {
  const db = openDatabase();
  seed(db);
  console.log(`Seeded ${sampleUsers.length} users, 1 child, 1 specialist link and ${sampleTasks.length} tasks`);
  db.close();
}

module.exports = { seed, sampleUsers, sampleTasks, SAMPLE_PASSWORD };
