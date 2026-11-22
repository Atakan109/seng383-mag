const express = require('express');
const { requireRole } = require('./auth');
const { childAccess } = require('./childAccess');

const SELECT_TASKS = `
  SELECT tasks.id, tasks.child_id AS childId, tasks.title, tasks.description,
         tasks.development_area AS developmentArea, tasks.due_date AS dueDate,
         tasks.status, tasks.assigned_by AS assignedById, users.name AS assignedByName
  FROM tasks
  LEFT JOIN users ON users.id = tasks.assigned_by`;

// Turns a database row into the JSON shape the frontend uses.
function toTask({ assignedById, assignedByName, ...task }) {
  return {
    ...task,
    assignedBy: assignedById ? { id: assignedById, name: assignedByName } : null,
  };
}

function isFilled(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// Accepts only real calendar dates written as YYYY-MM-DD.
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Routes for the tasks of one child (M4).
// auth is the requireAuth middleware, given by app.js.
function createTasksRouter(db, auth) {
  const router = express.Router();
  const canSeeChild = childAccess(db);

  function findTask(taskId, childId) {
    const row = db
      .prepare(`${SELECT_TASKS} WHERE tasks.id = ? AND tasks.child_id = ?`)
      .get(taskId, childId);
    return row ? toTask(row) : null;
  }

  // The child's tasks with their status (FR-M4-03, FR-M4-05, FR-M4-06).
  // childAccess lets in only the parent, the child and linked specialists.
  router.get('/children/:childId/tasks', auth, canSeeChild, (req, res) => {
    const rows = db
      .prepare(`${SELECT_TASKS} WHERE tasks.child_id = ? ORDER BY tasks.due_date, tasks.id`)
      .all(req.child.id);
    res.json(rows.map(toTask));
  });

  // A parent or a linked specialist assigns a task (FR-M4-01, FR-M4-02).
  router.post(
    '/children/:childId/tasks',
    auth,
    requireRole('parent', 'specialist'),
    canSeeChild,
    (req, res) => {
      const { title, description, developmentArea, dueDate } = req.body || {};
      if (!isFilled(title) || !isFilled(developmentArea) || !isFilled(dueDate)) {
        return res
          .status(400)
          .json({ error: 'Title, development area and due date are required' });
      }
      if (!isValidDate(dueDate)) {
        return res.status(400).json({ error: 'Due date must be a valid date (YYYY-MM-DD)' });
      }

      const result = db
        .prepare(
          `INSERT INTO tasks (title, description, development_area, due_date, child_id, assigned_by)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          title.trim(),
          isFilled(description) ? description.trim() : null,
          developmentArea.trim(),
          dueDate,
          req.child.id,
          req.user.id
        );
      return res.status(201).json(findTask(result.lastInsertRowid, req.child.id));
    }
  );

  // The child marks one of their own tasks as done (FR-M4-04).
  router.patch(
    '/children/:childId/tasks/:taskId',
    auth,
    requireRole('child'),
    canSeeChild,
    (req, res) => {
      const task = findTask(req.params.taskId, req.child.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { status } = req.body || {};
      if (status !== 'done') {
        return res.status(400).json({ error: 'Status can only be set to "done"' });
      }

      db.prepare("UPDATE tasks SET status = 'done' WHERE id = ?").run(task.id);
      return res.json(findTask(task.id, req.child.id));
    }
  );

  return router;
}

module.exports = { createTasksRouter };
