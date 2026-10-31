const { openDatabase } = require('./db');

// Synthetic sample data only. No real personal data.
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

// Replaces all tasks with the sample tasks.
function seed(db) {
  db.prepare('DELETE FROM tasks').run();
  const insert = db.prepare(
    `INSERT INTO tasks (title, description, development_area, due_date)
     VALUES (@title, @description, @developmentArea, @dueDate)`
  );
  for (const task of sampleTasks) {
    insert.run(task);
  }
}

// Runs only with `npm run seed`, not when the file is imported.
if (require.main === module) {
  const db = openDatabase();
  seed(db);
  console.log(`Seeded ${sampleTasks.length} tasks`);
  db.close();
}

module.exports = { seed, sampleTasks };
