const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { createToken, requireAuth } = require('./auth');
const { createSpecialistLinksRouter } = require('./specialistLinks');
const { createEventsRouter } = require('./events');

// Builds the Express app. The database is passed in so tests can use
// an in-memory database instead of the real file. jwtSecret signs login tokens.
function createApp(db, { jwtSecret = process.env.JWT_SECRET } = {}) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Copy backend/.env.example to backend/.env.');
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Same message for a wrong email and a wrong password, so the answer
    // does not tell anyone which emails are registered.
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }

    return res.json({
      token: createToken(user, jwtSecret),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });

  app.get('/api/auth/me', requireAuth(jwtSecret), (req, res) => {
    const user = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    return res.json(user);
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

  const auth = requireAuth(jwtSecret);
  app.use('/api', createSpecialistLinksRouter(db, auth));
  app.use('/api', createEventsRouter(db, auth));

  return app;
}

module.exports = { createApp };
