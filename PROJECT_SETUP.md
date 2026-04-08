# Maptive - Project Setup Guide

## Overview
Maptive is a network topology visualization and AI-powered network generation application with React frontend and FastAPI backend.

## Prerequisites

### System Requirements
- **Node.js**: 18.0+ (for frontend)
- **Python**: 3.9+ (for backend)
- **npm**: 8.0+ or **yarn**: 1.22+
- **Git**: Latest version

## Frontend Setup

### Dependencies & Libraries

#### Core Dependencies
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",      // Google Gemini AI integration
    "@radix-ui/react-slot": "^1.2.4",         // UI component primitives
    "@xyflow/react": "^12.10.2",              // Network topology visualization
    "canvas-confetti": "^1.9.4",             // Celebration animations
    "class-variance-authority": "^0.7.1",    // CSS class management
    "clsx": "^2.1.1",                        // Utility className management
    "dagre": "^0.8.5",                        // Graph layout algorithm
    "firebase": "^12.11.0",                   // Firebase authentication & storage
    "framer-motion": "^12.38.0",              // Animation library
    "jspdf": "^4.2.1",                       // PDF export functionality
    "lucide-react": "^1.7.0",                 // Icon library
    "pdfjs-dist": "^5.6.205",                // PDF processing
    "react": "^19.2.4",                       // React framework
    "react-dom": "^19.2.4",                  // React DOM
    "react-router-dom": "^7.14.0",           // Routing
    "tailwind-merge": "^3.5.0"                // Tailwind CSS utilities
  }
}
```

#### Development Dependencies
```json
{
  "devDependencies": {
    "@eslint/js": "^9.39.4",                 // ESLint configuration
    "@types/dagre": "^0.7.54",                // TypeScript definitions
    "@types/node": "^25.5.2",                 // Node.js types
    "@types/react": "^19.2.14",               // React types
    "@types/react-dom": "^19.2.3",            // React DOM types
    "@typescript-eslint/eslint-plugin": "^8.58.0", // TypeScript ESLint
    "@typescript-eslint/parser": "^8.58.0",   // TypeScript parser
    "@vitejs/plugin-react": "^6.0.1",         // Vite React plugin
    "autoprefixer": "^10.4.27",               // CSS autoprefixer
    "eslint": "^9.39.4",                      // JavaScript linter
    "eslint-plugin-react-hooks": "^7.0.1",     // React hooks ESLint
    "eslint-plugin-react-refresh": "^0.5.2",  // React refresh ESLint
    "globals": "^17.4.0",                     // ESLint globals
    "postcss": "^8.5.8",                      // CSS processing
    "tailwindcss": "^3.4.19",                 // CSS framework
    "typescript": "^6.0.2",                   // TypeScript compiler
    "vite": "^8.0.1"                          // Build tool
  }
}
```

### Installation Steps

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Backend Setup

### Python Dependencies

Create a `requirements.txt` file:

```txt
fastapi==0.104.1
uvicorn==0.24.0
networkx==3.2.1
pydantic==2.5.0
python-multipart==0.0.6
websockets==12.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
```

### Installation Steps

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start backend server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Environment Variables

### Frontend Environment (.env)

Create a `.env` file in the `frontend/` directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id

# xAI (Grok) Configuration
VITE_XAI_API_KEY=your-xai-api-key
VITE_XAI_MODEL=grok-4-1-fast-reasoning
VITE_XAI_VISION_MODEL=grok-4-1-vision
VITE_XAI_API_URL=https://api.x.ai/v1/chat/completions

# Google Gemini Configuration
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
VITE_GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
```

### Backend Environment (.env)

Create a `.env` file in the `backend/` directory:

```env
# Optional: Add any backend environment variables here
DEBUG=true
SECRET_KEY=your-secret-key-here
```

## External Services Setup

### 1. Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow setup wizard

2. **Enable Authentication**
   - Go to Authentication > Sign-in method
   - Enable Email/Password and Anonymous providers

3. **Setup Firestore Database**
   - Go to Firestore Database
   - Create new database in test mode
   - Setup security rules

4. **Get Configuration**
   - Go to Project Settings > General
   - Copy Firebase configuration to `.env`

### 2. xAI (Grok) Setup (Optional)

1. **Get xAI API Key**
   - Visit [xAI Platform](https://platform.x.ai/)
   - Create account and get API key
   - Add to `.env` as `VITE_XAI_API_KEY`

### 3. Google Gemini Setup (Optional)

1. **Get Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create API key
   - Add to `.env` as `VITE_GEMINI_API_KEY`

## Project Structure

```
Maptive/
frontend/
  src/
    components/          # React components
    lib/                # Utility functions
    pages/              # Page components
    context/            # React contexts
    types/              # TypeScript definitions
  public/              # Static assets
  package.json
  .env.example
  .env                 # Create this file

backend/
  graph_engine.py      # FastAPI application
  main.py              # Application entry point
  antigravity_system_prompt.txt
  venv/                # Python virtual environment
  requirements.txt     # Create this file

PROJECT_SETUP.md       # This file
```

## Running the Application

### Development Mode

1. **Start Backend**
   ```bash
   cd backend
   source venv/bin/activate  # Windows: venv\Scripts\activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Production Build

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## Features & Functionality

### Core Features
- **Network Topology Visualization** - Interactive canvas with drag-and-drop
- **AI-Powered Network Generation** - Generate networks from text prompts
- **PDF Upload & Processing** - Extract network requirements from PDFs
- **Real-time Collaboration** - WebSocket-based updates
- **Firebase Integration** - Authentication and data persistence
- **Export Functionality** - PDF and text export

### AI Integration
- **Mock Topology Generation** - Works without API keys
- **xAI Grok Integration** - Advanced AI responses
- **Google Gemini Integration** - Alternative AI provider
- **PDF Vision Analysis** - Process PDFs with AI

## Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**
   - Check Firebase configuration in `.env`
   - Ensure Authentication is enabled in Firebase console

2. **PDF Upload Not Working**
   - Check browser console for errors
   - Ensure PDF.js is properly loaded

3. **AI Not Responding**
   - Check API keys in `.env`
   - Mock topology works without API keys

4. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript version compatibility

### Debug Mode

Enable debug logging by checking browser console for:
- `https://openai.com/api/images/64x64.png` - Mock topology generation
- `https://openai.com/api/images/64x64.png` - AI API calls
- `https://openai.com/api/images/64x64.png` - PDF processing

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Check API key validity for AI services
