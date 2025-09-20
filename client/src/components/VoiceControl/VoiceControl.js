import React, { useState, useEffect } from 'react';
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Settings as SettingsIcon,
  VolumeUp as VolumeUpIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';

import { useVoice } from '../../contexts/VoiceContext';
import { useAuth } from '../../contexts/AuthContext';

const VoiceControl = () => {
  const {
    isListening,
    isProcessing,
    voiceEnabled,
    language,
    lastCommand,
    commandHistory,
    voiceStatus,
    transcript,
    startListening,
    stopListening,
    toggleVoiceControl,
    changeLanguage,
    browserSupportsSpeechRecognition,
    showVoiceFeedback
  } = useVoice();
  
  const { user, updateUser } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Voice status indicator
  const getStatusColor = () => {
    switch (voiceStatus) {
      case 'listening': return '#4267B2';
      case 'processing': return '#42b883';
      case 'success': return '#27ae60';
      case 'error': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = () => {
    switch (voiceStatus) {
      case 'listening': return language.includes('bn') ? 'শুনছি...' : 'Listening...';
      case 'processing': return language.includes('bn') ? 'প্রসেস করছি...' : 'Processing...';
      case 'success': return language.includes('bn') ? 'সফল!' : 'Success!';
      case 'error': return language.includes('bn') ? 'ত্রুটি!' : 'Error!';
      default: return language.includes('bn') ? 'প্রস্তুত' : 'Ready';
    }
  };

  // Show transcript when listening
  useEffect(() => {
    if (isListening && transcript) {
      setShowTranscript(true);
    } else {
      const timer = setTimeout(() => setShowTranscript(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript]);

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    changeLanguage(newLanguage);
    
    // Update user preferences
    if (user) {
      await updateUser({
        voiceSettings: {
          ...user.voiceSettings,
          voiceLanguage: newLanguage
        }
      });
    }
  };

  const handleVoiceToggle = async (enabled) => {
    toggleVoiceControl();
    
    // Update user preferences
    if (user) {
      await updateUser({
        voiceSettings: {
          ...user.voiceSettings,
          enableVoiceControl: enabled
        }
      });
    }
  };

  const voiceCommands = [
    { category: 'Navigation', commands: [
      { bengali: 'হোমে যাও', english: 'Go to home', action: 'Navigate to home page' },
      { bengali: 'প্রোফাইলে যাও', english: 'Go to profile', action: 'Navigate to profile' },
      { bengali: 'মেসেজে যাও', english: 'Go to messages', action: 'Navigate to messages' },
      { bengali: 'গ্রুপে যাও', english: 'Go to groups', action: 'Navigate to groups' },
    ]},
    { category: 'Posts', commands: [
      { bengali: 'লাইক করো', english: 'Like this', action: 'Like current post' },
      { bengali: 'পোস্ট করো', english: 'Create post', action: 'Open create post dialog' },
      { bengali: 'কমেন্ট করো', english: 'Comment', action: 'Open comment dialog' },
      { bengali: 'শেয়ার করো', english: 'Share this', action: 'Share current post' },
    ]},
    { category: 'Messages', commands: [
      { bengali: '[নাম] কে মেসেজ পাঠাও', english: 'Send message to [name]', action: 'Open chat with user' },
      { bengali: 'কল দাও', english: 'Make call', action: 'Start voice call' },
      { bengali: 'ভিডিও কল', english: 'Video call', action: 'Start video call' },
    ]},
    { category: 'Control', commands: [
      { bengali: 'স্ক্রল করো', english: 'Scroll down', action: 'Auto scroll down' },
      { bengali: 'স্ক্রল থামো', english: 'Stop scroll', action: 'Stop auto scrolling' },
      { bengali: 'খুজো [টেক্সট]', english: 'Search [text]', action: 'Search for content' },
      { bengali: 'লগআউট', english: 'Logout', action: 'Sign out from account' },
    ]}
  ];

  if (!browserSupportsSpeechRecognition) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000
        }}
      >
        <Alert severity="warning" sx={{ mb: 2 }}>
          আপনার ব্রাউজার ভয়েস রিকগনিশন সাপোর্ট করে না
        </Alert>
      </Box>
    );
  }

  return (
    <>
      {/* Voice Status Indicator */}
      <AnimatePresence>
        {(isListening || isProcessing || showTranscript) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 80,
              right: 20,
              zIndex: 1000,
              minWidth: 200
            }}
          >
            <Card
              sx={{
                backgroundColor: getStatusColor(),
                color: 'white',
                boxShadow: 3
              }}
            >
              <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <motion.div
                    animate={isListening ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <VolumeUpIcon fontSize="small" />
                  </motion.div>
                  <Typography variant="body2" fontWeight="bold">
                    {getStatusText()}
                  </Typography>
                </Box>
                {showTranscript && transcript && (
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    "{transcript}"
                  </Typography>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Control FAB */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Fab
            color={voiceEnabled ? (isListening ? 'secondary' : 'primary') : 'default'}
            onClick={handleToggleVoice}
            disabled={!voiceEnabled}
            sx={{
              animation: isListening ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(66, 103, 178, 0.7)'
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(66, 103, 178, 0)'
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(66, 103, 178, 0)'
                }
              }
            }}
          >
            {isListening ? <VolumeUpIcon /> : (voiceEnabled ? <MicIcon /> : <MicOffIcon />)}
          </Fab>
        </motion.div>

        <Fab
          size="small"
          onClick={() => setSettingsOpen(true)}
          sx={{ backgroundColor: 'background.paper' }}
        >
          <SettingsIcon />
        </Fab>

        <Fab
          size="small"
          onClick={() => setHelpOpen(true)}
          sx={{ backgroundColor: 'background.paper' }}
        >
          <HelpIcon />
        </Fab>
      </Box>

      {/* Voice Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ভয়েস কন্ট্রোল সেটিংস / Voice Control Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={voiceEnabled}
                  onChange={(e) => handleVoiceToggle(e.target.checked)}
                />
              }
              label="ভয়েস কন্ট্রোল চালু করুন / Enable Voice Control"
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>ভাষা / Language</InputLabel>
              <Select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={!voiceEnabled}
              >
                <MenuItem value="bn-BD">বাংলা (Bangladesh)</MenuItem>
                <MenuItem value="en-US">English (US)</MenuItem>
                <MenuItem value="en-GB">English (UK)</MenuItem>
              </Select>
            </FormControl>

            {lastCommand && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  শেষ কমান্ড / Last Command:
                </Typography>
                <Chip label={lastCommand} variant="outlined" />
              </Box>
            )}

            {commandHistory.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  কমান্ড ইতিহাস / Command History:
                </Typography>
                <List dense>
                  {commandHistory.slice(0, 5).map((cmd, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={cmd.command}
                        secondary={moment(cmd.timestamp).fromNow()}
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={cmd.language.includes('bn') ? 'বাংলা' : 'English'} 
                          size="small" 
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>বন্ধ করুন / Close</Button>
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>ভয়েস কমান্ড গাইড / Voice Commands Guide</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Ctrl + Space</strong> চেপে ভয়েস কন্ট্রোল চালু/বন্ধ করুন।<br/>
                Press <strong>Ctrl + Space</strong> to toggle voice control.
              </Typography>
            </Alert>

            {voiceCommands.map((category, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  {category.category}
                </Typography>
                <List dense>
                  {category.commands.map((cmd, cmdIndex) => (
                    <ListItem key={cmdIndex}>
                      <ListItemText
                        primary={
                          <Box>
                            <Typography component="span" fontWeight="bold">
                              {cmd.bengali}
                            </Typography>
                            {' / '}
                            <Typography component="span" fontWeight="bold">
                              {cmd.english}
                            </Typography>
                          </Box>
                        }
                        secondary={cmd.action}
                      />
                    </ListItem>
                  ))}
                </List>
                {index < voiceCommands.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>বন্ধ করুন / Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VoiceControl;