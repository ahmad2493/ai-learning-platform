/**
 * JWT Utility Functions
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Generates JWT tokens for user authentication
 * - Verifies JWT tokens and handles expiration
 * - Extracts tokens from Authorization headers
 * - Manages token payload (user ID, email, role)
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    user_id: user.user_id,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
};

/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
};