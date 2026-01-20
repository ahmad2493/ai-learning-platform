const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { generateToken } = require('../utils/jwt');

// Regular authentication routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/update-password', authController.updatePassword);

// Get current user
router.get('/me', authenticateToken, authController.getCurrentUser);

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  // Optional: If you track sessions in DB, invalidate them here
  // For now, just return success (token invalidation handled on client)
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Google OAuth - Sign In
router.get(
  '/google/signin',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth - Sign Up
router.get(
  '/google/signup',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth Callback
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
      
      // Redirect to mobile app with deep link
      const mobileRedirect = `darsgah://auth/callback?token=${token}&user_id=${req.user.user_id}`;
      
      // Send HTML page that will close the browser and return to app
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Authentication Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: block;
                stroke-width: 2;
                stroke: #4bb71b;
                stroke-miterlimit: 10;
                margin: 0 auto 20px;
                box-shadow: inset 0px 0px 0px #4bb71b;
                animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
              }
              .checkmark__circle {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                stroke-width: 2;
                stroke-miterlimit: 10;
                stroke: #4bb71b;
                fill: none;
                animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
              }
              .checkmark__check {
                transform-origin: 50% 50%;
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
              }
              @keyframes stroke {
                100% { stroke-dashoffset: 0; }
              }
              @keyframes scale {
                0%, 100% { transform: none; }
                50% { transform: scale3d(1.1, 1.1, 1); }
              }
              @keyframes fill {
                100% { box-shadow: inset 0px 0px 0px 30px #4bb71b; }
              }
              h2 { color: #333; margin: 0 0 10px; }
              p { color: #666; font-size: 14px; }
              .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 20px auto 0;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <script>
              window.onload = function() {
                // Try to redirect to the app
                setTimeout(function() {
                  window.location.href = "${mobileRedirect}";
                }, 1000);
                
                // Try to close the window after redirect
                setTimeout(function() {
                  window.close();
                }, 2000);
              };
            </script>
          </head>
          <body>
            <div class="container">
              <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
              <h2>✓ Authentication Successful</h2>
              <p>Redirecting back to app...</p>
              <div class="spinner"></div>
              <p style="font-size: 12px; color: #999; margin-top: 20px;">
                If not redirected automatically, you can close this window.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`darsgah://auth/error?error=callback_failed`);
    }
  }
);

module.exports = router;