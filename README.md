# AI Learning Platform

A comprehensive educational platform that combines traditional learning management with AI-powered assistance for students. The platform provides course management, test generation, and an intelligent AI assistant powered by RAG (Retrieval-Augmented Generation) technology.

## Project Overview

This platform enables students to:
- Access course materials and content
- Generate practice tests
- Interact with an AI assistant for physics-related questions
- Track learning outcomes and performance
- Manage their profiles and settings

## Architecture

The project follows a microservices architecture with three main components:

- **Frontend**: React Native mobile application (Expo)
- **Backend**: Node.js/Express REST API
- **AI Service**: FastAPI service with RAG-based question answering

## Team Members & Roles

### Sajeela Safdar (BCSF22M001)
**Role**: AI Development
- RAG system implementation
- Vector database management
- AI model integration

### Muhammad Ahmad (BCSF22M002)
**Role**: AI Development, DevOps
- AI service development
- Docker containerization
- Azure deployment and CI/CD pipelines
- Infrastructure setup

### Muhammad Abubakar (BCSF22M006)
**Role**: Backend Development
- REST API development
- Authentication and authorization
- Database models and controllers
- API endpoints and business logic

### Momna Butt (BCSF22M021)
**Role**: Frontend Development
- Mobile application UI/UX
- React Native components
- User interface implementation
- Navigation and state management

## Project Structure

```
ai-learning-platform/
├── frontend/          # React Native mobile app
├── backend/           # Node.js/Express API server
├── ai-service/        # FastAPI AI service with RAG
└── .github/           # GitHub Actions workflows
```

## Getting Started

### Prerequisites
- Node.js 22.x
- Python 3.11+
- MongoDB Atlas account
- Azure account (for deployment)

### Installation

See individual README files in each directory for detailed setup instructions:
- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)
- [AI Service README](./ai-service/README.md)

## Technology Stack

### Frontend
- React Native (Expo)
- React Navigation
- AsyncStorage

### Backend
- Node.js
- Express.js
- MongoDB (Atlas)
- Passport.js (OAuth)
- JWT authentication

### AI Service
- FastAPI
- LangChain
- ChromaDB
- OpenAI API
- MathBERT embeddings

### DevOps
- Docker
- Azure Web Apps
- GitHub Actions
- Azure File Share

## Features

- User authentication (Email/Password, Google OAuth)
- Course management
- Test generation
- AI-powered question answering
- Learning outcome tracking
- Profile management
- Secure file uploads

## Deployment

- **Backend**: Azure Web App (DarsGah)
- **AI Service**: Azure Web App (Darsgah-Rag)
- **Frontend**: Expo managed workflow

## License

This project is developed as part of Final Year Project (FYP).

## Contributing

This is a university project. For contributions, please contact the team members.

