# Backend Service

Node.js/Express REST API server providing authentication, course management, test generation, and user management functionality.

## Author
**Muhammad Abubakar (BCSF22M006)** - Backend Development

## Features

### Authentication & Authorization
- Email/Password authentication
- Google OAuth 2.0 integration
- JWT token-based session management
- OTP-based password reset
- Two-factor authentication support

### User Management
- Student registration and profile management
- Admin user management
- Role-based access control (Student, Admin)

### Course Management
- Course creation and management
- Course content management
- Enrollment tracking
- Learning outcomes tracking

### Test Generation
- Dynamic test creation
- Question bank management
- Test result tracking

### File Management
- Profile picture uploads (AWS S3)
- Secure file handling

## Directory Structure

```
backend/
├── src/
│   ├── config/          # Passport.js OAuth configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication, validation middleware
│   ├── models/          # MongoDB Mongoose models
│   ├── routes/          # API route definitions
│   └── utils/           # Helper functions (JWT, OTP, email)
├── server.js            # Main application entry point
└── package.json         # Dependencies
```

## Setup

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file with:
```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BUCKET_NAME=your_bucket_name
PORT=5000
```

### Run
```bash
node server.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth callback
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-otp` - Verify OTP for password reset

### Students
- `GET /api/students/profile` - Get student profile
- `PUT /api/students/profile` - Update student profile
- `GET /api/students/courses` - Get enrolled courses
- `GET /api/students/tests` - Get student tests

### Admins
- `GET /api/admins/courses` - Manage courses
- `POST /api/admins/courses` - Create course
- `GET /api/admins/students` - Manage students

## Database Models

- **User**: Base user model
- **Student**: Student-specific data
- **Admin**: Admin user data
- **Course**: Course information
- **CourseContent**: Course materials
- **Enrollment**: Student-course relationships
- **Test**: Test information
- **TestQuestionBank**: Test questions
- **LearningOutcome**: CLO tracking
- **Otp**: OTP storage for password reset

## Security

- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- Secure session management

## Deployment

Deployed on Azure Web App (DarsGah) via GitHub Actions.
See `.github/workflows/main_darsgah.yml` for deployment configuration.

