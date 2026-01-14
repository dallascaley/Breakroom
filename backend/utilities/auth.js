/**
 * Authentication utilities for extracting JWT tokens from requests.
 * Supports both cookie-based auth (web) and Authorization header (mobile).
 */

/**
 * Extract JWT token from request.
 * First checks Authorization header (for mobile clients),
 * then falls back to cookie (for web clients).
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - The JWT token or null if not found
 */
function extractToken(req) {
  // First check Authorization header (mobile clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Fall back to cookie (web clients)
  return req.cookies?.jwtToken || null;
}

module.exports = { extractToken };
