/**
 * Authentication middleware for terminal service.
 * Supports JWT tokens (same key as FastAPI backend) and static API_TOKEN.
 */

const jwt = require('jsonwebtoken');

// Read from environment (set via dotenv in server.js)
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const API_TOKEN = process.env.API_TOKEN;
const JWT_ALGORITHM = 'HS256';

/**
 * Verify a token (JWT or API_TOKEN).
 * @param {string} token - The token to verify
 * @returns {{ valid: boolean, payload?: object, isApiToken?: boolean, error?: string }}
 */
function verifyToken(token) {
  // Check for missing token
  if (!token || token.trim() === '') {
    return { valid: false, error: 'No token provided' };
  }

  // Check if it's the static API_TOKEN
  if (token === API_TOKEN) {
    return { valid: true, isApiToken: true };
  }

  // Try to verify as JWT
  try {
    const payload = jwt.verify(token, JWT_SECRET_KEY, {
      algorithms: [JWT_ALGORITHM],
    });

    // Must be an access token (not refresh)
    if (payload.type !== 'access') {
      return { valid: false, error: 'Access token required (got refresh token)' };
    }

    return { valid: true, payload };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: false, error: 'Invalid token' };
  }
}

/**
 * Express middleware for authenticating requests.
 * Expects Authorization: Bearer <token> header.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  const result = verifyToken(token);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  // Attach auth info to request for downstream use
  req.auth = result;
  next();
}

/**
 * Socket.io middleware for authenticating connections.
 * Expects token in handshake query: io({ query: { token } })
 */
function verifySocketToken(socket, next) {
  const token = socket.handshake.query.token;
  const result = verifyToken(token);

  if (!result.valid) {
    return next(new Error(result.error || 'Authentication failed'));
  }

  // Attach auth info to socket for downstream use
  socket.auth = result;
  next();
}

/**
 * Verify raw WebSocket connection token.
 * Used for legacy WebSocket protocol on /terminal path.
 * @param {string} token - Token from query string
 * @returns {{ valid: boolean, error?: string }}
 */
function verifyRawWebSocketToken(token) {
  return verifyToken(token);
}

module.exports = {
  verifyToken,
  authMiddleware,
  verifySocketToken,
  verifyRawWebSocketToken,
};
