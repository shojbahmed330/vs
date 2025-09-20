# React Native Mobile App with Push Notifications

এই হলো আমাদের সোশ্যাল মিডিয়া প্ল্যাটফর্মের React Native মোবাইল অ্যাপ যেটাতে Firebase Push Notification এবং real-time features রয়েছে।

## 🚀 Features

### Mobile App Features
- **Authentication System** - Complete login/register with JWT
- **News Feed** - Real-time post feed with likes and comments
- **Push Notifications** - Firebase Cloud Messaging integration
- **Real-time Messaging** - Socket.io integration
- **Live Streaming** - Agora integration (placeholder)
- **Friends System** - Friend requests and management
- **Search** - User and content search
- **Profile Management** - User profile with settings
- **Offline Support** - AsyncStorage for data persistence
- **Multi-language** - Bengali and English support

### Push Notification Features
- **Real-time Notifications** - Instant push notifications
- **Smart Targeting** - User preference based notifications
- **Multiple Device Support** - FCM token management
- **Notification Types** - Friend requests, messages, likes, comments, live streams
- **Background Processing** - Notifications work when app is closed
- **Sound & Vibration** - Customizable notification alerts

## 📱 Mobile App Structure

```
mobile-app/
├── src/
│   ├── App.js                     # Main app component
│   ├── contexts/                  # React contexts
│   │   ├── AuthContext.js         # Authentication state
│   │   ├── PushNotificationContext.js # Push notification management
│   │   └── SocketContext.js       # Socket.io connection
│   ├── navigation/                # Navigation setup
│   │   ├── AuthNavigator.js       # Auth flow navigation
│   │   └── MainNavigator.js       # Main app navigation
│   ├── screens/                   # All app screens
│   │   ├── Auth/                  # Authentication screens
│   │   ├── Home/                  # Home feed screen
│   │   ├── Messages/              # Messaging screens
│   │   ├── Notifications/         # Notifications screen
│   │   ├── Profile/               # Profile screens
│   │   ├── Search/                # Search screen
│   │   ├── Friends/               # Friends management
│   │   ├── Posts/                 # Post creation/viewing
│   │   ├── LiveStream/            # Live streaming
│   │   └── Settings/              # App settings
│   └── services/                  # API services
│       └── api.js                 # Centralized API calls
├── package.json                   # Dependencies
├── index.js                       # Entry point with FCM setup
└── metro.config.js               # Metro bundler config
```

## 🔧 Backend Push Notification System

### New Files Added:
- `services/pushNotificationService.js` - Core push notification service
- `models/Notification.js` - Enhanced notification model
- Updated `routes/notifications.js` - FCM token management routes
- Updated `models/User.js` - FCM tokens and preferences

### Push Notification Service Features:
```javascript
// Send to single user
await pushNotificationService.sendToUser(userId, {
  title: 'নতুন বার্তা',
  body: 'আপনার জন্য একটি নতুন বার্তা এসেছে',
  type: 'message',
  data: { senderId: '...' }
});

// Send to multiple users
await pushNotificationService.sendToMultipleUsers(userIds, notification);

// Send to friends
await pushNotificationService.sendToFriends(userId, notification);

// Send with user preferences
await pushNotificationService.sendWithPreferences(userId, notification);
```

## 📋 Installation & Setup

### Prerequisites
- Node.js 16+
- React Native CLI
- Android Studio / Xcode
- Firebase Project

### Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Add Android/iOS apps to your Firebase project
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Generate Firebase Admin SDK private key
5. Add Firebase configuration to the app

### Backend Setup
1. Install new dependencies:
```bash
npm install firebase-admin
```

2. Add Firebase Admin configuration in `services/pushNotificationService.js`:
```javascript
const serviceAccount = {
  type: "service_account",
  project_id: "your-project-id",
  private_key_id: "your-private-key-id",
  private_key: "your-private-key",
  client_email: "your-client-email",
  // ... other fields from your service account key
};
```

3. Start the server:
```bash
npm run dev
```

### Mobile App Setup
1. Navigate to mobile app directory:
```bash
cd mobile-app
```

2. Install dependencies:
```bash
npm install
```

3. For iOS, install pods:
```bash
cd ios && pod install && cd ..
```

4. Add Firebase configuration files:
   - Android: `android/app/google-services.json`
   - iOS: `ios/GoogleService-Info.plist`

5. Start Metro bundler:
```bash
npm start
```

6. Run on device/emulator:
```bash
# For Android
npm run android

# For iOS
npm run ios
```

## 🔐 API Endpoints

### Push Notification Routes
```
POST /api/notifications/fcm-token        # Register FCM token
DELETE /api/notifications/fcm-token      # Remove FCM token
GET /api/notifications                   # Get user notifications
PUT /api/notifications/:id/read          # Mark notification as read
PUT /api/notifications/read-all          # Mark all as read
GET /api/notifications/preferences       # Get notification preferences
PUT /api/notifications/preferences       # Update preferences
POST /api/notifications/test             # Send test notification (dev)
```

### Authentication Routes (Updated)
```
POST /api/auth/login                     # Login with FCM token support
POST /api/auth/register                  # Register with FCM token support
POST /api/auth/fcm-token                 # Update FCM token
DELETE /api/auth/fcm-token               # Remove FCM token
```

## 📱 Mobile App Features Detail

### Authentication Flow
1. **Welcome Screen** - App introduction
2. **Login/Register** - Email/password authentication
3. **FCM Token Registration** - Automatic push notification setup
4. **Biometric Auth** - Optional fingerprint/face login

### Push Notification Types
- **friend_request** - New friend request received
- **friend_accept** - Friend request accepted
- **message** - New private message
- **post_like** - Someone liked your post
- **post_comment** - Someone commented on your post
- **live_stream** - Friend started live streaming
- **general** - General app notifications

### Real-time Features
- **Socket.io Integration** - Real-time updates
- **Online Status** - See who's online
- **Live Notifications** - Instant in-app notifications
- **Message Status** - Read receipts

### Offline Capabilities
- **AsyncStorage** - Local data persistence
- **Cached Images** - Offline image viewing
- **Queue Management** - Offline action queuing
- **Sync on Connect** - Auto-sync when back online

## 🛠️ Configuration

### Environment Variables
Create `.env` file in backend:
```
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Database
MONGODB_URI=mongodb://localhost:27017/socialmedia

# JWT
JWT_SECRET=your-jwt-secret

# Server
PORT=5000
```

### Mobile App Configuration
Update `mobile-app/src/services/api.js`:
```javascript
const getBaseURL = async () => {
  // Update with your server URL
  return 'http://your-server-ip:5000';
};
```

## 🔄 Push Notification Flow

1. **App Install/Open**
   - Generate FCM token
   - Send token to server
   - Store in user's fcmTokens array

2. **User Action** (like, comment, message)
   - Backend triggers push notification
   - Firebase sends to user's devices
   - App receives and displays notification

3. **Notification Interaction**
   - User taps notification
   - App opens to relevant screen
   - Mark notification as read

## 📊 Database Schema Updates

### User Model Additions
```javascript
// FCM Tokens for push notifications
fcmTokens: [String],

// Notification preferences
notificationPreferences: {
  friend_request: { type: Boolean, default: true },
  message: { type: Boolean, default: true },
  post_like: { type: Boolean, default: true },
  // ... more types
},

// Device information
devices: [{
  deviceId: String,
  platform: String, // 'ios' | 'android' | 'web'
  fcmToken: String,
  lastActive: Date
}],

// Unread notification count
unreadNotifications: { type: Number, default: 0 }
```

### Notification Model
```javascript
{
  recipient: ObjectId,     // User receiving notification
  sender: ObjectId,        // User who triggered notification
  title: String,           // Notification title
  message: String,         // Notification body
  type: String,           // Notification type
  data: Object,           // Additional data
  read: Boolean,          // Read status
  targetId: String,       // Related object ID
  createdAt: Date
}
```

## 🚀 Deployment

### Backend Deployment
1. Update Firebase service account credentials
2. Set environment variables
3. Deploy to your server (Heroku, DigitalOcean, AWS, etc.)

### Mobile App Deployment
1. Update server URLs in config
2. Build release APK/IPA
3. Upload to Play Store/App Store

### Firebase Setup for Production
1. Enable FCM in Firebase Console
2. Add server key to backend
3. Configure APNs certificates for iOS
4. Test push notifications

## 🧪 Testing

### Push Notification Testing
```bash
# Test notification endpoint
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification",
    "type": "general"
  }'
```

### Mobile App Testing
1. Run on physical device for push notifications
2. Test in background/foreground states
3. Test notification interactions
4. Test offline/online scenarios

## 📝 Notes

- **Firebase Admin SDK** is required for server-side push notifications
- **FCM tokens** are device-specific and may change
- **Notification preferences** allow users to control what they receive
- **Real-time features** use Socket.io for instant updates
- **Offline support** ensures app works without internet

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Test your changes thoroughly
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Created by MiniMax Agent** 🤖

*This implementation provides a complete mobile app with push notifications for the social media platform. The system is scalable, secure, and follows best practices for React Native development and Firebase integration.*