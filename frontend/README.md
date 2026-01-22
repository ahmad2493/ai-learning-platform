# Frontend Mobile Application

React Native mobile application built with Expo, providing a user-friendly interface for students to access courses, generate tests, and interact with the AI assistant.

## Author
**Momna Butt (BCSF22M021)** - Frontend Development

## Features

### Authentication Screens
- Sign up and sign in
- Google OAuth integration
- Forgot password flow
- OTP verification
- Password reset

### Dashboard
- Student dashboard with course overview
- Quick access to features
- Performance metrics

### Course Management
- View enrolled courses
- Access course content
- Track learning progress

### AI Assistant
- Chat interface with AI
- Physics question answering
- Real-time responses

### Test Generation
- Generate practice tests
- View past papers
- Test results and performance

### Profile Management
- View and edit profile
- Change password
- Security settings
- Profile picture upload

### Settings
- App preferences
- Theme customization
- Notifications
- About app information

## Directory Structure

```
frontend/
├── app/
│   ├── components/      # Reusable UI components
│   ├── constants/       # App constants and legal text
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # Screen components
│   └── utils/           # Helper functions (API, theme)
├── assets/              # Images and static assets
├── app.json             # Expo configuration
└── package.json         # Dependencies
```

## Setup

### Installation
```bash
npm install
```

### Environment Variables
Create `.env` file or set in `app/utils/apiConfig.js`:
```
EXPO_PUBLIC_API_BASE_URL=your_backend_api_url
```

### Run
```bash
npm start
# or
expo start
```

### Build
```bash
# Android
expo build:android

# iOS
expo build:ios
```

## Code Quality

This project uses ESLint for code linting and Prettier for code formatting.

### Linting
```bash
npm run lint          # Checks for code quality issues (ESLint)
npm run lint:fix      # Automatically fixes ESLint issues where possible
```

### Formatting
```bash
npm run format        # Formats all code with Prettier
npm run format:check  # Checks if code is properly formatted
```

## Key Screens

### Authentication
- `SignInScreen.js` - User login
- `SignUpScreen.js` - User registration
- `ForgotPasswordScreen.js` - Password recovery
- `OtpVerificationScreen.js` - OTP verification
- `ResetPasswordScreen.js` - Password reset
- `AuthCallbackScreen.js` - OAuth callback handler

### Main Features
- `StudentDashboardScreen.js` - Main dashboard
- `AiAssistantScreen.js` - AI chat interface
- `AiChatScreen.js` - Chat UI component
- `TestGeneratorScreen.js` - Test creation
- `PastPapersScreen.js` - Past papers view
- `CloPerformanceScreen.js` - Learning outcomes

### Profile & Settings
- `ProfileScreen.js` - User profile
- `SettingsScreen.js` - App settings
- `SecurityScreen.js` - Security options
- `ChangePasswordScreen.js` - Password change
- `NotificationsScreen.js` - Notifications
- `AboutAppScreen.js` - App information

## UI Components

- `CustomAlert.js` - Custom alert dialogs
- `Dropdown.js` - Dropdown menu component
- `SidebarComponent.js` - Navigation sidebar

## API Integration

API calls are handled through:
- `app/utils/api.js` - API request functions
- `app/utils/apiConfig.js` - API configuration

## Theming

Theme management:
- `app/utils/theme.js` - Theme configuration
- `app/utils/ThemeContext.js` - Theme context provider

## Dependencies

- **Expo**: ~54.0.30
- **React Native**: 0.81.5
- **React Navigation**: Navigation library
- **AsyncStorage**: Local data storage
- **Expo Image Picker**: Image selection
- **Expo Web Browser**: OAuth handling

## Deployment

Deployed via Expo managed workflow. The app can be built and distributed through:
- Expo Go (development)
- Standalone builds (production)
- App stores (iOS/Android)

