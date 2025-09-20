import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  Alert,
  IconButton,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Notifications,
  NotificationsOff,
  Close,
  Settings
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// VAPID Public Key - Replace with your actual VAPID public key
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLx4AaWKKBKnmzOKjN5Jn2ql2tGgfBr5YQvhElbh9cV4Db4zYjZuaXU';

const WebPushManager = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState(Notification.permission);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    messages: true,
    friendRequests: true,
    likes: true,
    comments: true,
    shares: true,
    mentions: true,
    groupInvites: true,
    events: true,
    liveStreams: true,
    stories: true
  });
  const [subscription, setSubscription] = useState(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (user && 'serviceWorker' in navigator && 'PushManager' in window) {
      checkExistingSubscription();
      loadNotificationSettings();
    }
  }, [user]);

  useEffect(() => {
    // Check if we should show permission dialog
    if (permission === 'default' && user && !sessionStorage.getItem('push-permission-asked')) {
      const timer = setTimeout(() => {
        setShowPermissionDialog(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [permission, user]);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        // Verify subscription with server
        await sendSubscriptionToServer(existingSubscription);
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const response = await axios.get('/api/users/notification-settings');
      if (response.data.settings) {
        setNotificationSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const requestPermission = async () => {
    setRegistering(true);
    sessionStorage.setItem('push-permission-asked', 'true');
    
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await subscribeUser();
        setShowPermissionDialog(false);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setRegistering(false);
    }
  };

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      setSubscription(subscription);
      await sendSubscriptionToServer(subscription);
      
      // Show welcome notification
      showWelcomeNotification();
    } catch (error) {
      console.error('Error subscribing user:', error);
    }
  };

  const sendSubscriptionToServer = async (subscription) => {
    try {
      await axios.post('/api/users/push-subscription', {
        subscription: subscription.toJSON()
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  };

  const unsubscribeUser = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        
        // Remove from server
        await axios.delete('/api/users/push-subscription');
      }
    } catch (error) {
      console.error('Error unsubscribing user:', error);
    }
  };

  const updateNotificationSettings = async (settings) => {
    try {
      await axios.put('/api/users/notification-settings', { settings });
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  const showWelcomeNotification = () => {
    if (permission === 'granted') {
      new Notification('নোটিফিকেশন চালু হয়েছে!', {
        body: 'আপনি এখন গুরুত্বপূর্ণ আপডেট পাবেন',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      });
    }
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('টেস্ট নোটিফিকেশন', {
        body: 'এটি একটি টেস্ট নোটিফিকেশন',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      });
    }
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...notificationSettings, [key]: value };
    updateNotificationSettings(newSettings);
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null; // Push notifications not supported
  }

  const getNotificationSettingsLabels = () => ({
    messages: 'নতুন মেসেজ',
    friendRequests: 'বন্ধুত্বের অনুরোধ',
    likes: 'লাইক',
    comments: 'কমেন্ট',
    shares: 'শেয়ার',
    mentions: 'মেনশন',
    groupInvites: 'গ্রুপ আমন্ত্রণ',
    events: 'ইভেন্ট',
    liveStreams: 'লাইভ স্ট্রিম',
    stories: 'স্টোরি'
  });

  return (
    <>
      {/* Permission Request Dialog */}
      <Dialog
        open={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Notifications color="primary" />
            নোটিফিকেশন পেতে চান?
            <IconButton
              size="small"
              onClick={() => setShowPermissionDialog(false)}
              sx={{ ml: 'auto' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={2}>
            গুরুত্বপূর্ণ আপডেট এবং নতুন বার্তার জন্য নোটিফিকেশন চালু করুন।
          </Typography>
          
          <Typography variant="body2" color="text.secondary" mb={2}>
            আপনি যেকোনো সময় সেটিংস থেকে এটি বন্ধ করতে পারবেন।
          </Typography>

          {permission === 'denied' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              নোটিফিকেশন ব্লক করা আছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন।
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPermissionDialog(false)}>
            এখন নয়
          </Button>
          <Button 
            variant="contained" 
            onClick={requestPermission}
            disabled={registering || permission === 'denied'}
          >
            {registering ? 'অনুমতি চাইছি...' : 'অনুমতি দিন'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          নোটিফিকেশন সেটিংস
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              কোন ধরনের নোটিফিকেশন পেতে চান তা নির্বাচন করুন
            </Typography>
            
            <Box display="flex" gap={2} mb={2}>
              <Button
                variant={permission === 'granted' ? 'contained' : 'outlined'}
                color={permission === 'granted' ? 'success' : 'primary'}
                startIcon={permission === 'granted' ? <Notifications /> : <NotificationsOff />}
                onClick={permission === 'granted' ? unsubscribeUser : requestPermission}
                disabled={registering}
              >
                {permission === 'granted' ? 'চালু আছে' : 'চালু করুন'}
              </Button>
              
              {permission === 'granted' && (
                <Button
                  variant="outlined"
                  onClick={testNotification}
                >
                  টেস্ট করুন
                </Button>
              )}
            </Box>
          </Box>

          {permission === 'granted' && (
            <List>
              {Object.entries(getNotificationSettingsLabels()).map(([key, label], index) => (
                <React.Fragment key={key}>
                  <ListItem>
                    <ListItemText primary={label} />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notificationSettings[key] || false}
                        onChange={(e) => handleSettingChange(key, e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < Object.keys(getNotificationSettingsLabels()).length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettingsDialog(false)}>
            বন্ধ করুন
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Settings Button */}
      {user && (
        <Box
          position="fixed"
          bottom={20}
          right={20}
          zIndex={1000}
          sx={{
            '@media (max-width: 600px)': {
              bottom: 80, // Account for mobile navigation
            }
          }}
        >
          <IconButton
            color="primary"
            onClick={() => setShowSettingsDialog(true)}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.paper',
                boxShadow: 4,
              }
            }}
          >
            {permission === 'granted' ? <Notifications /> : <NotificationsOff />}
          </IconButton>
        </Box>
      )}
    </>
  );
};

export default WebPushManager;
