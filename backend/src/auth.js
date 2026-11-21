const jwt = require('jsonwebtoken');

// How long a login stays valid.
const TOKEN_LIFETIME = '8h';

// Creates a signed token that says who the user is and what their role is.
function createToken(user, secret) {
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: TOKEN_LIFETIME });
}

// Lets the request through only with a valid token in the header
// "Authorization: Bearer <token>". Puts the user's id and role in req.user.
function requireAuth(secret) {
  return (req, res, next) => {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Login required' });
    }

    try {
      const payload = jwt.verify(token, secret);
      req.user = { id: Number(payload.sub), role: payload.role };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

// Lets the request through only for the given roles. Use after requireAuth.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed for this role' });
    }
    return next();
  };
}

module.exports = { createToken, requireAuth, requireRole };
