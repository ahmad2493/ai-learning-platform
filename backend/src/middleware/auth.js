const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authenticate user token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if account is active
    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active',
      });
    }

    req.user = {
      id: user._id,
      user_id: user.user_id,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed',
    });
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.status === 'Active') {
        req.user = {
          id: user._id,
          user_id: user.user_id,
          email: user.email,
          role_id: user.role_id,
          role_name: user.role_name,
          first_name: user.first_name,
          last_name: user.last_name,
        };
      }
    }
  } catch (error) {
    // Continue without user
  }
  next();
};

/**
 * Check if user has required role
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
};