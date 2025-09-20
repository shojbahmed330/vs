import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  IconButton,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  GetApp,
  Close,
  PhoneAndroid,
  Computer,
  Wifi,
  CloudOff
} from '@mui/icons-material';
import { usePWA } from '../../contexts/PWAContext';

const PWAInstallPrompt = () => {
  const { 
    isInstallable, 
    isInstalled, 
    installApp, 
    isOnline, 
    syncStatus,
    offlineQueue 
  } = usePWA();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      // Show prompt after a delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineNotice(true);
    } else {
      setShowOfflineNotice(false);
    }
  }, [isOnline]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowSuccess(true);
      setShowPrompt(false);
    }
  };

  const handleClosePrompt = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-closed', 'true');
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'warning';
      case 'synced': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'সিঙ্ক হচ্ছে...';
      case 'synced': return 'সিঙ্ক সম্পন্ন';
      case 'error': return 'সিঙ্ক ত্রুটি';
      default: return '';
    }
  };

  return (
    <>
      {/* Install Prompt Dialog */}
      <Dialog
        open={showPrompt && !sessionStorage.getItem('pwa-prompt-closed')}
        onClose={handleClosePrompt}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <GetApp color="primary" />
            অ্যাপ ইনস্টল করুন
            <IconButton
              size="small"
              onClick={handleClosePrompt}
              sx={{ ml: 'auto' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={2}>
            একটি নেটিভ অ্যাপের মতো অভিজ্ঞতার জন্য আমাদের অ্যাপটি আপনার ডিভাইসে ইনস্টল করুন।
          </Typography>
          
          <Box display="flex" gap={2} mb={3}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CloudOff color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="body2">
                  অফলাইন ব্যবহার
                </Typography>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <PhoneAndroid color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="body2">
                  নেটিভ অভিজ্ঞতা
                </Typography>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Wifi color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="body2">
                  দ্রুত লোডিং
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            আপনার ডেটা নিরাপদ থাকবে এবং আপনি যেকোনো সময় অ্যাপটি আনইনস্টল করতে পারবেন।
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrompt}>
            পরে করব
          </Button>
          <Button 
            variant="contained" 
            onClick={handleInstall}
            startIcon={<GetApp />}
          >
            ইনস্টল করুন
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity="success"
          sx={{ width: '100%' }}
        >
          অ্যাপ সফলভাবে ইনস্টল হয়েছে!
        </Alert>
      </Snackbar>

      {/* Offline Notice */}
      <Snackbar
        open={showOfflineNotice}
        autoHideDuration={null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity="warning"
          sx={{ width: '100%' }}
          icon={<CloudOff />}
          action={
            offlineQueue > 0 && (
              <Chip 
                size="small" 
                label={`${offlineQueue} অপেক্ষমাণ`} 
                color="warning" 
              />
            )
          }
        >
          আপনি অফলাইনে আছেন
        </Alert>
      </Snackbar>

      {/* Sync Status */}
      {syncStatus !== 'idle' && (
        <Snackbar
          open={true}
          autoHideDuration={syncStatus === 'synced' ? 3000 : null}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity={getSyncStatusColor()}
            sx={{ width: '100%' }}
          >
            {getSyncStatusText()}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

export default PWAInstallPrompt;
