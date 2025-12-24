const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

require('dotenv').config();

const passport = require('./src/config/passport'); 

const app = express();

// ========================================
// MIDDLEWARE
// ========================================

// CORS - Updated to allow mobile app connections
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Allow localhost and your local network
    const allowedOrigins = [
      'http://localhost:5173',
      'http://192.168.100.12:19006',
      'exp://192.168.100.12:8081'
    ];
    
    // Check if origin is in allowed list OR starts with your local IP
    if (allowedOrigins.includes(origin) || origin.startsWith('http://192.168.100') || origin.includes('ngrok')) {
      callback(null, true);
    } else {
      callback(null, true); // In development, allow all
    }
  },
  credentials: true,
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // true in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ========================================
// DATABASE CONNECTION
// ========================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// ========================================
// ROUTES
// ========================================

const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);

const adminRoutes = require('./src/routes/AdminRoutes');
app.use('/api/admins', adminRoutes);

const studentRoutes = require('./src/routes/StudentRoutes');
app.use('/api/students', studentRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'AI Learning Platform API is running',
    googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0',() => {
  console.log(`Server running on port ${PORT}`);
  //console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Enabled' : 'Disabled'}`);
});