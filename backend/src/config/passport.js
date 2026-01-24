/**
 * Passport.js Configuration - Google OAuth Setup
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Configures Google OAuth 2.0 authentication strategy
 * - Handles Google sign-in callback
 * - Creates or updates user account from Google profile
 * - Generates unique user IDs for new users
 * - Serializes/deserializes user sessions
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Generate unique user_id
const generateUserId = async () => {
  const count = await User.countDocuments();
  return `USR${String(count + 1).padStart(6, '0')}`;
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL || 'https://bd8229de9bbf.ngrok-free.app'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const firstName = profile.name.givenName || 'User';
        const lastName = profile.name.familyName || googleId;
        const profilePhoto = profile.photos[0]?.value || 'default-avatar.png';

        // Check if user already exists
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
          // User exists - update Google ID if not set
          if (!user.googleId) {
            user.googleId = googleId;
            user.updated_at = new Date();
            await user.save();
          }

          return done(null, user);
        }

        // Create new user
        const user_id = await generateUserId();

        user = await User.create({
          user_id,
          role_id: 'ROLE001',
          role_name: 'Student',
          name: firstName + lastName,
          cnic: `GOOGLE-${googleId}`, // Placeholder for Google users
          email: email.toLowerCase(),
          contact_no: '0000000000', // Placeholder
          password: 'GOOGLE_AUTH_USER', // Placeholder - Google users don't use password
          gender: 'Not Specified',
          dob: new Date('2000-01-01'),
          address: 'Not Provided',
          status: 'Active',
          profile_photo_url: profilePhoto,
          googleId: googleId,
          created_at: new Date(),
          updated_at: new Date(),
        });

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;