const express = require('express');
const { requireRole } = require('./auth');
const { childAccess } = require('./childAccess');

// Routes for children and linking specialists (M2).
// auth is the requireAuth middleware, given by app.js.
function createSpecialistLinksRouter(db, auth) {
  const router = express.Router();
  const canSeeChild = childAccess(db);
  const parentOnly = requireRole('parent');

  // Parent: own children. Specialist: linked children (FR-M2-06). Child: self.
  router.get('/children', auth, (req, res) => {
    const { id, role } = req.user;
    const queries = {
      parent: 'SELECT id, name FROM children WHERE parent_id = ? ORDER BY id',
      child: 'SELECT id, name FROM children WHERE user_id = ? ORDER BY id',
      specialist: `SELECT children.id, children.name, specialist_links.specialist_type AS specialistType
                   FROM children
                   JOIN specialist_links ON specialist_links.child_id = children.id
                   WHERE specialist_links.specialist_id = ?
                   ORDER BY children.id`,
    };
    res.json(db.prepare(queries[role]).all(id));
  });

  // The specialists linked to a child, with name, email and type (FR-M2-03).
  router.get('/children/:childId/specialists', auth, parentOnly, canSeeChild, (req, res) => {
    const specialists = db
      .prepare(
        `SELECT users.id, users.name, users.email,
                specialist_links.specialist_type AS specialistType,
                specialist_links.linked_at AS linkedAt
         FROM specialist_links
         JOIN users ON users.id = specialist_links.specialist_id
         WHERE specialist_links.child_id = ?
         ORDER BY specialist_links.id`
      )
      .all(req.child.id);
    res.json(specialists);
  });

  // Link a registered specialist by email and type (FR-M2-01, FR-M2-02).
  router.post('/children/:childId/specialists', auth, parentOnly, canSeeChild, (req, res) => {
    const { email, specialistType } = req.body || {};
    if (!email || !specialistType) {
      return res.status(400).json({ error: 'Email and specialist type are required' });
    }

    const specialist = db
      .prepare("SELECT id, name, email FROM users WHERE email = ? AND role = 'specialist'")
      .get(email);
    if (!specialist) {
      return res.status(404).json({ error: 'No registered specialist with this email' });
    }

    const alreadyLinked = db
      .prepare('SELECT 1 FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
      .get(req.child.id, specialist.id);
    if (alreadyLinked) {
      return res.status(409).json({ error: 'This specialist is already linked to the child' });
    }

    db.prepare(
      'INSERT INTO specialist_links (child_id, specialist_id, specialist_type) VALUES (?, ?, ?)'
    ).run(req.child.id, specialist.id, specialistType);

    return res.status(201).json({ ...specialist, specialistType });
  });

  // Unlink a specialist (FR-M2-04). The confirmation step is in the frontend.
  router.delete(
    '/children/:childId/specialists/:specialistId',
    auth,
    parentOnly,
    canSeeChild,
    (req, res) => {
      const result = db
        .prepare('DELETE FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
        .run(req.child.id, req.params.specialistId);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'This specialist is not linked to the child' });
      }
      return res.status(204).end();
    }
  );

  return router;
}

module.exports = { createSpecialistLinksRouter };
