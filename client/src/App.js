import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { motion, AnimatePresence } from 'framer-motion';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { VoiceProvider } from './contexts/VoiceContext';
import { AgoraProvider } from './contexts/AgoraContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SearchProvider } from './contexts/SearchContext';
import { PWAProvider } from './contexts/PWAContext';

// Components
import Navbar from './components/Layout/Navbar';
import VoiceControl from './components/VoiceControl/VoiceControl';
import LoadingScreen from './components/Common/LoadingScreen';
import CallManager from './components/Calls/CallManager';
import PWAInstallPrompt from './components/PWA/PWAInstallPrompt';
import WebPushManager from './components/Notifications/WebPushManager';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';
import Messages from './pages/Messages/Messages';
import Groups from './pages/Groups/Groups';
import Settings from './pages/Settings/Settings';
import NotFound from './pages/NotFound/NotFound';
import BiometricDemo from './pages/BiometricDemo';
import CallsPage from './pages/CallsPage';
import CallDemo from './pages/CallDemo';
import FriendsPage from './pages/FriendsPage';
import LiveStreamingPage from './pages/LiveStreamingPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import BusinessDashboard from './pages/Business/BusinessDashboard';
import StoriesPage from './pages/Stories/StoriesPage';
import SearchPage from './pages/Search/SearchPage';

// Route Protection
import { AdminRoute, BusinessRoute } from './components/Auth/RouteProtection';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useTheme } from './contexts/ThemeContext';

function AppContent() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isInitializing || loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="App">
        <AnimatePresence mode="wait">
          {user ? (
              <motion.div
                key="authenticated"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PWAProvider>
                  <SearchProvider>
                    <SocketProvider>
                      <VoiceProvider>
                        <AgoraProvider>
                          <PWAInstallPrompt />
                          <WebPushManager />
                          <Navbar />
                          <VoiceControl />
                          <CallManager />
                          <main style={{ paddingTop: '70px' }}>
                            <Routes>
                              <Route path="/" element={<Home />} />
                              <Route path="/profile/:userId?" element={<Profile />} />
                              <Route path="/friends" element={<FriendsPage />} />
                              <Route path="/stories" element={<StoriesPage />} />
                              <Route path="/search" element={<SearchPage />} />
                              <Route path="/livestream" element={<LiveStreamingPage />} />
                              <Route path="/admin" element={
                                <AdminRoute requiredPermission="view_analytics">
                                  <AdminDashboard />
                                </AdminRoute>
                              } />
                              <Route path="/business" element={
                                <BusinessRoute>
                                  <BusinessDashboard />
                                </BusinessRoute>
                              } />
                              <Route path="/messages" element={<Messages />} />
                              <Route path="/messages/:userId" element={<Messages />} />
                              <Route path="/groups" element={<Groups />} />
                              <Route path="/groups/:groupId" element={<Groups />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/biometric" element={<BiometricDemo />} />
                              <Route path="/calls" element={<CallsPage />} />
                              <Route path="/call-demo" element={<CallDemo />} />
                              <Route path="/login" element={<Navigate to="/" replace />} />
                              <Route path="/register" element={<Navigate to="/" replace />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </main>
                        </AgoraProvider>
                      </VoiceProvider>
                    </SocketProvider>
                  </SearchProvider>
                </PWAProvider>
              </motion.div>
          ) : (
            <motion.div
              key="unauthenticated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/biometric" element={<BiometricDemo />} />
                <Route path="/call-demo" element={<CallDemo />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppWrapper />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppWrapper() {
  const { theme } = useTheme();
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </MuiThemeProvider>
  );
}

export default App;