// Checks that the logged-in user may see the child in the URL (:childId).
// Allowed: the child's parent, the child's own account, and a specialist who is
// linked to the child right now. Use after requireAuth on every
// /api/children/:childId/... route. Puts the child row in req.child.
function childAccess(db) {
  return (req, res, next) => {
    const child = db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.childId);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { id, role } = req.user;
    const isParent = role === 'parent' && child.parent_id === id;
    const isTheChild = role === 'child' && child.user_id === id;
    // Checked on every request, so an unlinked specialist loses access at once (FR-M2-05).
    const isLinkedSpecialist =
      role === 'specialist' &&
      Boolean(
        db
          .prepare('SELECT 1 FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
          .get(child.id, id)
      );

    if (!isParent && !isTheChild && !isLinkedSpecialist) {
      return res.status(403).json({ error: 'No access to this child' });
    }

    req.child = child;
    return next();
  };
}

module.exports = { childAccess };
