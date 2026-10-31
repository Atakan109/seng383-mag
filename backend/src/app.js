const express = require('express');
const cors = require('cors');

// Builds the Express app. The database is passed in so tests can use
// an in-memory database instead of the real file.
function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/tasks', (req, res) => {
    const tasks = db
      .prepare(
        `SELECT id, title, description,
                development_area AS developmentArea,
                due_date AS dueDate,
                status
         FROM tasks
         ORDER BY id`
      )
      .all();
    res.json(tasks);
  });

  return app;
}

module.exports = { createApp };
