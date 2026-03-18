/**
 * Authentication Routes - API Endpoint Definitions
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Defines all authentication-related API routes
 * - Handles user registration, login, and OAuth
 * - Manages password reset and OTP verification
 * - Implements two-factor authentication endpoints
 * - Protects routes with authentication middleware
 */

const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { generateToken } = require('../utils/jwt');

console.log('authController:', authController);

// ==================== REGULAR AUTHENTICATION ROUTES ====================
router.post('/register', authController.registerUser); // Step 1: Send OTP
router.post('/verify-registration-otp', authController.verifyRegistrationOTP); // Step 2: Verify OTP & Create Account
router.post('/login', authController.loginUser);

// ==================== TWO-FACTOR AUTHENTICATION ROUTES ====================
router.post('/verify-2fa-otp', authController.verifyTwoFactorOTP); // ✅ NEW
router.post('/toggle-2fa', authenticateToken, authController.toggleTwoFactor); // ✅ NEW

// ==================== FORGOT PASSWORD ROUTES (OTP-BASED) ====================
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOTP);
router.post('/reset-password', authController.resetPassword);

// ==================== UPDATE PASSWORD ====================
router.post('/update-password', authController.updatePassword);

// ==================== GET CURRENT USER ====================
router.get('/me', authenticateToken, authController.getCurrentUser);

// ==================== LOGOUT ====================
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ==================== GOOGLE OAUTH ROUTES ====================
router.get(
  '/google/signin',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
); 

router.get(
  '/google/signup',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `darsgah://auth/error?error=oauth_failed`,
    session: false,
  }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`darsgah://auth/error?error=auth_failed`);
      }

      const token = generateToken(req.user);
      const mobileRedirect = `darsgah://auth/callback?token=${token}&user_id=${req.user.user_id}`;

      console.log('✅ [GOOGLE AUTH] Redirecting to app with token for user:', req.user.email);
      return res.redirect(mobileRedirect);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`darsgah://auth/error?error=callback_failed`);
    }
  }
);


module.exports = router;