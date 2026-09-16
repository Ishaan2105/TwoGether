const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Verifies the Bearer token, loads the user and attaches it to req.user.
 * Rejects with 401 when the token is missing, invalid or the user no longer exists.
 */
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized — no token provided' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized — user not found' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized — invalid or expired token' });
  }
}

module.exports = { protect };