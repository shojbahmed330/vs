# Voice Social

## Overview
A modern social media platform with real-time messaging, stories, push notifications, and PWA capabilities.

## Features
- 🔔 Web Push Notifications
- 📱 Progressive Web App (PWA)
- 🌙 Dark/Light Mode
- 🔍 Advanced Search
- 📖 24-hour Stories
- 💬 Real-time Chat
- 📁 File Upload & Sharing
- 🔐 JWT Authentication
- 🎯 Real-time Features with Socket.io

## Tech Stack

### Frontend
- React 18
- Material-UI
- Firebase (Push Notifications)
- Socket.io Client
- PWA with Service Worker
- Cloudinary (File Upload)

### Backend
- Node.js & Express
- MongoDB with Mongoose
- Socket.io (Real-time)
- Firebase Admin SDK
- Cloudinary SDK
- JWT Authentication
- Winston Logging

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB Atlas account
- Firebase project
- Cloudinary account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd voice-social
```

2. **Install dependencies**
```bash
npm install
cd client && npm install
```

3. **Environment Setup**

Copy `.env.example` to `.env` and fill in your credentials:

**Server (.env):**
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

**Client (client/.env):**
```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_VAPID_KEY=your_vapid_key
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
REACT_APP_CLOUDINARY_API_KEY=your_cloudinary_api_key
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

4. **Start Development Servers**
```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend
cd client && npm start
```

## Deployment

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Configure Environment Variables**
Add all environment variables in Vercel Dashboard → Settings → Environment Variables

### Manual Deployment

1. **Build the project**
```bash
cd client && npm run build
```

2. **Deploy to your hosting service**

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Upload
- `POST /api/upload/images` - Upload multiple images
- `POST /api/upload/video` - Upload single video
- `POST /api/upload/audio` - Upload single audio
- `POST /api/upload/avatar` - Upload user avatar

### Search
- `GET /api/search` - Universal search
- `GET /api/search/suggestions` - Search suggestions
- `GET /api/search/trending` - Trending topics

## Socket.io Events

### Connection
- `connect` - User connected
- `disconnect` - User disconnected

### Messaging
- `send_message` - Send new message
- `new_message` - Receive new message
- `message_read` - Mark message as read
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Notifications
- `new_notification` - New notification received
- `mark_notification_read` - Mark notification as read

### Stories
- `story_view` - View story
- `story_reaction` - React to story

## PWA Features

### Service Worker
- Offline functionality
- Background sync
- Push notifications
- Caching strategies

### Installation
Users can install the app on their devices:
- **Desktop**: Chrome/Edge will show install prompt
- **Mobile**: "Add to Home Screen" option in browser menu

## Development

### Project Structure
```
voice-social/
├── client/                 # React frontend
│   ├── public/
│   │   ├── sw.js          # Service Worker
│   │   ├── manifest.json   # PWA Manifest
│   │   └── offline.html    # Offline page
│   └── src/
│       ├── components/     # React components
│       ├── contexts/       # React contexts
│       ├── services/       # API services
│       └── utils/          # Utilities
├── models/                 # Database models
├── routes/                 # API routes
├── middleware/             # Express middleware
├── config/                 # Configuration files
├── utils/                  # Server utilities
└── server.js              # Main server file
```

### Available Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@voicesocial.com or create an issue in the repository.

---

**Author:** MiniMax Agent  
**Version:** 1.0.0  
**Last Updated:** 2025-09-20