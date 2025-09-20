import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Slider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  VolumeUp as VoiceIcon,
  Security as SecurityIcon,
  Palette as ThemeIcon,
  Language as LanguageIcon,
  Notifications as NotificationIcon,
  Privacy as PrivacyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  PhotoCamera as PhotoIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import { useVoice } from '../../contexts/VoiceContext';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { 
    voiceEnabled, 
    language, 
    toggleVoiceControl, 
    changeLanguage,
    browserSupportsSpeechRecognition 
  } = useVoice();
  
  const [settings, setSettings] = useState({
    voice: {
      enableVoiceControl: true,
      voiceLanguage: 'bn-BD',
      voiceSensitivity: 0.8
    },
    privacy: {
      profileVisibility: 'public',
      canReceiveMessages: 'everyone'
    },
    notifications: {
      postLikes: true,
      comments: true,
      messages: true,
      friendRequests: true
    },
    general: {
      preferredLanguage: 'both',
      theme: 'light'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setSettings({
        voice: user.voiceSettings || settings.voice,
        privacy: user.privacy || settings.privacy,
        notifications: user.notifications || settings.notifications,
        general: {
          preferredLanguage: user.preferredLanguage || 'both',
          theme: 'light'
        }
      });
    }
  }, [user]);

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const updateData = {
        voiceSettings: settings.voice,
        privacy: settings.privacy,
        notifications: settings.notifications,
        preferredLanguage: settings.general.preferredLanguage
      };
      
      await updateUser(updateData);
      // Show success message
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    try {
      await axios.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setChangePasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Show success message
    } catch (error) {
      console.error('Error changing password:', error);
    }
  };

  const SettingsCard = ({ title, icon, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            {icon}
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
          </Box>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Settings
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Customize your Voice Social experience
      </Typography>

      {/* Profile Settings */}
      <SettingsCard title="Profile" icon={<EditIcon color="primary" />}>
        <Box display="flex" alignItems="center" gap={3} mb={3}>
          <Box position="relative">
            <Avatar src={user?.avatar} sx={{ width: 80, height: 80 }}>
              {user?.fullName?.charAt(0)}
            </Avatar>
            <IconButton
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': { backgroundColor: 'primary.dark' }
              }}
              size="small"
            >
              <PhotoIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box>
            <Typography variant="h6">{user?.fullName}</Typography>
            <Typography variant="body2" color="text.secondary">
              @{user?.username}
            </Typography>
            <Button variant="outlined" size="small" sx={{ mt: 1 }}>
              Edit Profile
            </Button>
          </Box>
        </Box>
      </SettingsCard>

      {/* Voice Control Settings */}
      <SettingsCard title="Voice Control" icon={<VoiceIcon color="primary" />}>
        {!browserSupportsSpeechRecognition && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your browser doesn't support speech recognition. Voice control features will be limited.
          </Alert>
        )}
        
        <List>
          <ListItem>
            <ListItemText
              primary="Enable Voice Control"
              secondary="Allow voice commands to control the app"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.voice.enableVoiceControl}
                onChange={(e) => {
                  handleSettingChange('voice', 'enableVoiceControl', e.target.checked);
                  toggleVoiceControl();
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Voice Language"
              secondary="Language for voice recognition"
            />
            <ListItemSecondaryAction>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={settings.voice.voiceLanguage}
                  onChange={(e) => {
                    handleSettingChange('voice', 'voiceLanguage', e.target.value);
                    changeLanguage(e.target.value);
                  }}
                >
                  <MenuItem value="bn-BD">বাংলা</MenuItem>
                  <MenuItem value="en-US">English (US)</MenuItem>
                  <MenuItem value="en-GB">English (UK)</MenuItem>
                </Select>
              </FormControl>
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Voice Sensitivity"
              secondary="How sensitive voice detection should be"
            />
            <ListItemSecondaryAction sx={{ width: 200 }}>
              <Slider
                value={settings.voice.voiceSensitivity}
                onChange={(e, value) => handleSettingChange('voice', 'voiceSensitivity', value)}
                min={0.1}
                max={1.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </SettingsCard>

      {/* Privacy Settings */}
      <SettingsCard title="Privacy" icon={<PrivacyIcon color="primary" />}>
        <List>
          <ListItem>
            <ListItemText
              primary="Profile Visibility"
              secondary="Who can see your profile"
            />
            <ListItemSecondaryAction>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                >
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="friends">Friends Only</MenuItem>
                  <MenuItem value="private">Private</MenuItem>
                </Select>
              </FormControl>
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Message Permissions"
              secondary="Who can send you messages"
            />
            <ListItemSecondaryAction>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={settings.privacy.canReceiveMessages}
                  onChange={(e) => handleSettingChange('privacy', 'canReceiveMessages', e.target.value)}
                >
                  <MenuItem value="everyone">Everyone</MenuItem>
                  <MenuItem value="friends">Friends Only</MenuItem>
                  <MenuItem value="nobody">Nobody</MenuItem>
                </Select>
              </FormControl>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </SettingsCard>

      {/* Notification Settings */}
      <SettingsCard title="Notifications" icon={<NotificationIcon color="primary" />}>
        <List>
          <ListItem>
            <ListItemText
              primary="Post Likes"
              secondary="Notify when someone likes your posts"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.notifications.postLikes}
                onChange={(e) => handleSettingChange('notifications', 'postLikes', e.target.checked)}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Comments"
              secondary="Notify when someone comments on your posts"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.notifications.comments}
                onChange={(e) => handleSettingChange('notifications', 'comments', e.target.checked)}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Messages"
              secondary="Notify about new messages"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.notifications.messages}
                onChange={(e) => handleSettingChange('notifications', 'messages', e.target.checked)}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Friend Requests"
              secondary="Notify about new friend requests"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.notifications.friendRequests}
                onChange={(e) => handleSettingChange('notifications', 'friendRequests', e.target.checked)}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </SettingsCard>

      {/* Security Settings */}
      <SettingsCard title="Security" icon={<SecurityIcon color="primary" />}>
        <List>
          <ListItem button onClick={() => setChangePasswordDialog(true)}>
            <ListItemText
              primary="Change Password"
              secondary="Update your account password"
            />
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Two-Factor Authentication"
              secondary="Add an extra layer of security"
            />
            <ListItemSecondaryAction>
              <Button variant="outlined" size="small">
                Setup
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </SettingsCard>

      {/* General Settings */}
      <SettingsCard title="General" icon={<LanguageIcon color="primary" />}>
        <List>
          <ListItem>
            <ListItemText
              primary="Preferred Language"
              secondary="Language for app interface"
            />
            <ListItemSecondaryAction>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={settings.general.preferredLanguage}
                  onChange={(e) => handleSettingChange('general', 'preferredLanguage', e.target.value)}
                >
                  <MenuItem value="bengali">বাংলা</MenuItem>
                  <MenuItem value="english">English</MenuItem>
                  <MenuItem value="both">Both</MenuItem>
                </Select>
              </FormControl>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </SettingsCard>

      {/* Save Button */}
      <Box display="flex" justifyContent="center" mt={4}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={loading}
            sx={{ px: 4 }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </motion.div>
      </Box>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialog} onClose={() => setChangePasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
            error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
            helperText={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword ? 'Passwords do not match' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained"
            disabled={!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;