import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Tabs,
  Tab
} from '@mui/material';
import {
  FaceRetouchingNatural,
  RecordVoiceOver,
  Login,
  PersonSearch
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import * as faceapi from 'face-api.js';

const BiometricLogin = ({ onClose }) => {
  const { loginWithBiometric, loading, error } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);
  const [userId, setUserId] = useState('');
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faceStream, setFaceStream] = useState(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    loadFaceApiModels();
  }, []);

  const loadFaceApiModels = async () => {
    try {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      setFaceApiLoaded(true);
    } catch (error) {
      console.error('Face API models loading error:', error);
      setLocalError('ফেস রিকগনিশন মডেল লোড করতে সমস্যা হয়েছে');
    }
  };

  const startFaceLogin = async () => {
    if (!userId.trim()) {
      setLocalError('ইউজার আইডি বা ইমেইল প্রদান করুন');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      setFaceStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setLocalError('ক্যামেরা অ্যাক্সেস পেতে সমস্যা হয়েছে');
    }
  };

  const authenticateWithFace = async () => {
    if (!videoRef.current || !faceApiLoaded) {
      setLocalError('ফেস অ্যাপি লোড হয়নি');
      return;
    }

    try {
      setLocalLoading(true);
      const video = videoRef.current;
      
      // Detect faces using face-api.js
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setLocalError('কোনো মুখ সনাক্ত করা যায়নি। দয়া করে ভালোভাবে আলোতে ক্যামেরার সামনে বসুন');
        return;
      }

      if (detections.length > 1) {
        setLocalError('একাধিক মুখ সনাক্ত করা হয়েছে। দয়া করে শুধু আপনার মুখ দেখান');
        return;
      }

      // Get face descriptor
      const descriptor = detections[0].descriptor;
      const descriptorArray = Array.from(descriptor);

      // Authenticate with biometric data
      const result = await loginWithBiometric('face', userId, JSON.stringify(descriptorArray));
      
      if (result.success) {
        setSuccess('ফেস রিকগনিশন দিয়ে সফলভাবে লগইন হয়েছে!');
        stopFaceStream();
        setTimeout(() => {
          onClose && onClose();
        }, 2000);
      } else {
        setLocalError(result.error || 'ফেস অথেন্তিকেশন ব্যর্থ');
      }
    } catch (error) {
      console.error('Face authentication error:', error);
      setLocalError('ফেস অথেন্তিকেশনে সমস্যা হয়েছে');
    } finally {
      setLocalLoading(false);
    }
  };

  const stopFaceStream = () => {
    if (faceStream) {
      faceStream.getTracks().forEach(track => track.stop());
      setFaceStream(null);
    }
  };

  const startVoiceLogin = async () => {
    if (!userId.trim()) {
      setLocalError('ইউজার আইডি বা ইমেইল প্রদান করুন');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // In a real implementation, you would extract voice features
        const mockVoicePrint = Array.from({length: 256}, () => Math.random());
        
        try {
          setLocalLoading(true);
          
          const result = await loginWithBiometric('voice', userId, {
            voicePrint: JSON.stringify(mockVoicePrint),
            phrase: 'আমার নাম বাংলা ভয়েস রিকগনিশন'
          });
          
          if (result.success) {
            setSuccess('ভয়েস রিকগনিশন দিয়ে সফলভাবে লগইন হয়েছে!');
            setTimeout(() => {
              onClose && onClose();
            }, 2000);
          } else {
            setLocalError(result.error || 'ভয়েস অথেন্তিকেশন ব্যর্থ');
          }
        } catch (error) {
          setLocalError('ভয়েস অথেন্তিকেশনে সমস্যা হয়েছে');
        } finally {
          setLocalLoading(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Auto stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 5000);
      
    } catch (error) {
      setLocalError('মাইক্রোফোন অ্যাক্সেস পেতে সমস্যা হয়েছে');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClose = () => {
    stopFaceStream();
    stopVoiceRecording();
    onClose && onClose();
  };

  return (
    <Dialog open={true} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Login />
          বায়োমেট্রিক লগইন
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={3}>
          <TextField
            fullWidth
            label="ইউজার আইডি বা ইমেইল"
            variant="outlined"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="আপনার ইউজার আইডি বা ইমেইল লিখুন"
            InputProps={{
              startAdornment: <PersonSearch sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Box>

        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label="ফেস রিকগনিশন" icon={<FaceRetouchingNatural />} />
          <Tab label="ভয়েস রিকগনিশন" icon={<RecordVoiceOver />} />
        </Tabs>

        {selectedTab === 0 && (
          <Box mt={2}>
            <Typography variant="body2" gutterBottom>
              আপনার মুখ ক্যামেরার সামনে রাখুন এবং লগইন করুন
            </Typography>
            
            <Box mt={2} textAlign="center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ 
                  width: '100%', 
                  maxWidth: '400px', 
                  borderRadius: '8px',
                  display: faceStream ? 'block' : 'none'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
              
              <Box mt={2}>
                {!faceStream ? (
                  <Button 
                    variant="contained" 
                    onClick={startFaceLogin}
                    startIcon={<FaceRetouchingNatural />}
                    disabled={!faceApiLoaded || !userId.trim()}
                    size="large"
                  >
                    {faceApiLoaded ? 'ক্যামেরা চালু করুন' : 'ফেস মডেল লোড হচ্ছে...'}
                  </Button>
                ) : (
                  <Box>
                    <Button 
                      variant="contained" 
                      onClick={authenticateWithFace}
                      disabled={localLoading || loading}
                      startIcon={localLoading || loading ? <CircularProgress size={20} /> : <Login />}
                      size="large"
                    >
                      {localLoading || loading ? 'যাচাই করা হচ্ছে...' : 'ফেস দিয়ে লগইন করুন'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={stopFaceStream}
                      sx={{ ml: 2 }}
                    >
                      বাতিল
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {selectedTab === 1 && (
          <Box mt={2}>
            <Typography variant="body2" gutterBottom>
              নিচের বাক্যটি পড়ুন: "আমার নাম বাংলা ভয়েস রিকগনিশন"
            </Typography>
            
            <Box mt={2} textAlign="center">
              <Typography variant="h6" color="primary" gutterBottom>
                "আমার নাম বাংলা ভয়েস রিকগনিশন"
              </Typography>
              
              {!isRecording ? (
                <Button 
                  variant="contained" 
                  onClick={startVoiceLogin}
                  startIcon={<RecordVoiceOver />}
                  disabled={!userId.trim() || localLoading || loading}
                  size="large"
                >
                  রেকর্ডিং শুরু করুন
                </Button>
              ) : (
                <Box>
                  <CircularProgress />
                  <Typography variant="body2" mt={1}>
                    রেকর্ডিং চলছে... (৫ সেকেন্ড)
                  </Typography>
                  <Button 
                    variant="outlined" 
                    onClick={stopVoiceRecording}
                    sx={{ mt: 1 }}
                  >
                    বন্ধ করুন
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Alerts */}
        {(localError || error) && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => { setLocalError(''); }}>
            {localError || error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={localLoading || loading}>
          বন্ধ করুন
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BiometricLogin;
