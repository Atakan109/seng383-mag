const express = require('express');
const { childAccess } = require('./childAccess');

// Helper: converts either { startsAt, endsAt } or { date, startTime, endTime } into ISO timestamps.
function normalizeEventTimes(body) {
  if (body.startsAt && body.endsAt) {
    return { startsAt: String(body.startsAt).trim(), endsAt: String(body.endsAt).trim() };
  }
  if (body.date && body.startTime && body.endTime) {
    const d = String(body.date).trim();
    return {
      startsAt: `${d}T${String(body.startTime).trim()}`,
      endsAt: `${d}T${String(body.endTime).trim()}`,
    };
  }
  return null;
}

// Helper: computes [weekStart, weekEndExclusive) ISO bounds from a week start date (YYYY-MM-DD).
function getWeekBounds(weekParam) {
  const parsed = new Date(`${weekParam}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const startIso = parsed.toISOString().slice(0, 10);
  const endObj = new Date(parsed);
  endObj.setUTCDate(endObj.getUTCDate() + 7);
  const endIso = endObj.toISOString().slice(0, 10);
  return { startIso, endIso };
}

// Routes for weekly schedule events (M3).
function createEventsRouter(db, auth) {
  const router = express.Router();
  const canSeeChild = childAccess(db);

  // List events for a child, filtered by childId and optional ?week=YYYY-MM-DD (FR-M3-03, FR-M3-04, FR-M3-06).
  router.get('/children/:childId/events', auth, canSeeChild, (req, res) => {
    const { week } = req.query;
    let sql = `
      SELECT events.id,
             events.child_id AS childId,
             events.created_by AS createdBy,
             users.name AS creatorName,
             events.title,
             events.starts_at AS startsAt,
             events.ends_at AS endsAt,
             events.event_type AS eventType
      FROM events
      JOIN users ON users.id = events.created_by
      WHERE events.child_id = ?
    `;
    const params = [req.child.id];

    if (week) {
      const bounds = getWeekBounds(String(week));
      if (!bounds) {
        return res.status(400).json({ error: 'Invalid week date format (expected YYYY-MM-DD)' });
      }
      sql += ' AND substr(events.starts_at, 1, 10) >= ? AND substr(events.starts_at, 1, 10) < ?';
      params.push(bounds.startIso, bounds.endIso);
    }

    sql += ' ORDER BY events.starts_at ASC, events.id ASC';

    const events = db.prepare(sql).all(...params);
    return res.json(events);
  });

  // Create a schedule event for a child (FR-M3-01, FR-M3-02).
  router.post('/children/:childId/events', auth, canSeeChild, (req, res) => {
    if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Children cannot create schedule events' });
    }

    const body = req.body || {};
    const times = normalizeEventTimes(body);
    if (!body.title || !String(body.title).trim() || !times) {
      return res
        .status(400)
        .json({ error: 'Title, date/start time and end time are required' });
    }

    const cleanType =
      body.eventType && String(body.eventType).trim() ? String(body.eventType).trim() : 'general';

    const result = db
      .prepare(
        `INSERT INTO events (child_id, created_by, title, starts_at, ends_at, event_type)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.child.id,
        req.user.id,
        String(body.title).trim(),
        times.startsAt,
        times.endsAt,
        cleanType
      );

    const created = db
      .prepare(
        `SELECT events.id,
                events.child_id AS childId,
                events.created_by AS createdBy,
                users.name AS creatorName,
                events.title,
                events.starts_at AS startsAt,
                events.ends_at AS endsAt,
                events.event_type AS eventType
         FROM events
         JOIN users ON users.id = events.created_by
         WHERE events.id = ?`
      )
      .get(result.lastInsertRowid);

    return res.status(201).json(created);
  });

  // Update a schedule event; only the event creator is allowed (FR-M3-05, FR-M3-02).
  router.put('/children/:childId/events/:eventId', auth, canSeeChild, (req, res) => {
    const existing = db
      .prepare('SELECT * FROM events WHERE id = ? AND child_id = ?')
      .get(req.params.eventId, req.child.id);

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the event creator can edit this event' });
    }

    const body = req.body || {};
    const times = normalizeEventTimes(body);
    if (!body.title || !String(body.title).trim() || !times) {
      return res
        .status(400)
        .json({ error: 'Title, date/start time and end time are required' });
    }

    const cleanType =
      body.eventType && String(body.eventType).trim()
        ? String(body.eventType).trim()
        : existing.event_type;

    db.prepare(
      `UPDATE events
       SET title = ?, starts_at = ?, ends_at = ?, event_type = ?
       WHERE id = ?`
    ).run(String(body.title).trim(), times.startsAt, times.endsAt, cleanType, existing.id);

    const updated = db
      .prepare(
        `SELECT events.id,
                events.child_id AS childId,
                events.created_by AS createdBy,
                users.name AS creatorName,
                events.title,
                events.starts_at AS startsAt,
                events.ends_at AS endsAt,
                events.event_type AS eventType
         FROM events
         JOIN users ON users.id = events.created_by
         WHERE events.id = ?`
      )
      .get(existing.id);

    return res.json(updated);
  });

  // Delete a schedule event; only the event creator is allowed (FR-M3-05).
  router.delete('/children/:childId/events/:eventId', auth, canSeeChild, (req, res) => {
    const existing = db
      .prepare('SELECT * FROM events WHERE id = ? AND child_id = ?')
      .get(req.params.eventId, req.child.id);

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the event creator can delete this event' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(existing.id);
    return res.status(204).end();
  });

  return router;
}

module.exports = { createEventsRouter };
