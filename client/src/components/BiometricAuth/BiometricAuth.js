import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@mui/material';
import {
  Button,
  Switch,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  FaceRetouchingNatural,
  RecordVoiceOver,
  Fingerprint,
  Security,
  Settings,
  CheckCircle,
  Error
} from '@mui/icons-material';
import axios from 'axios';
import * as faceapi from 'face-api.js';

const BiometricAuth = () => {
  const [settings, setSettings] = useState({
    faceRecognition: { isEnabled: false, accuracy: 0.85 },
    voiceRecognition: { isEnabled: false, accuracy: 0.8, language: 'bn-BD' },
    fingerprint: { isEnabled: false },
    preferences: {
      fallbackToPassword: true,
      requireBiometricForSensitive: true,
      biometricTimeout: 24 * 60 * 60 * 1000,
      enableAntiSpoofing: true
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [enrollDialog, setEnrollDialog] = useState({ open: false, type: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [faceStream, setFaceStream] = useState(null);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);

  useEffect(() => {
    loadBiometricSettings();
    loadFaceApiModels();
  }, []);

  const loadFaceApiModels = async () => {
    try {
      // Load face-api.js models from public folder
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      setFaceApiLoaded(true);
    } catch (error) {
      console.error('Face API models loading error:', error);
      setError('ফেস রিকগনিশন মডেল লোড করতে সমস্যা হয়েছে');
    }
  };

  const loadBiometricSettings = async () => {
    try {
      const response = await axios.get('/api/biometric/settings');
      setSettings(response.data);
    } catch (error) {
      setError('বায়োমেট্রিক সেটিংস লোড করতে সমস্যা হয়েছে');
    }
  };

  const toggleBiometric = async (type, enabled) => {
    if (enabled) {
      setEnrollDialog({ open: true, type });
    } else {
      try {
        await axios.post(`/api/biometric/disable/${type}`);
        await loadBiometricSettings();
        setSuccess(`${type} রিকগনিশন বন্ধ করা হয়েছে`);
      } catch (error) {
        setError('বায়োমেট্রিক পদ্ধতি বন্ধ করতে সমস্যা হয়েছে');
      }
    }
  };

  const startFaceEnrollment = async () => {
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
      setError('ক্যামেরা অ্যাক্সেস পেতে সমস্যা হয়েছে');
    }
  };

  const captureFaceData = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded) {
      setError('ফেস অ্যাপি লোড হয়নি');
      return;
    }

    try {
      setLoading(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      // Detect faces using face-api.js
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setError('কোনো মুখ সনাক্ত করা যায়নি। দয়া করে ক্যামেরার সামনে বসুন');
        setLoading(false);
        return;
      }

      if (detections.length > 1) {
        setError('একাধিক মুখ সনাক্ত করা হয়েছে। দয়া করে গোটা ফ্রেমে শুধু আপনার মুখ দেখান');
        setLoading(false);
        return;
      }

      // Get face descriptor
      const descriptor = detections[0].descriptor;
      const descriptorArray = Array.from(descriptor);
      
      setDetectedFaces([detections[0]]);

      // Draw detection box on canvas
      const displaySize = { width: canvas.width, height: canvas.height };
      faceapi.draw.drawDetections(canvas, detections.map(d => d.detection).map(det => det.forSize(displaySize.width, displaySize.height)));
      faceapi.draw.drawFaceLandmarks(canvas, detections.map(d => d.landmarks).map(landmarks => landmarks.forSize(displaySize.width, displaySize.height)));

      // Send to backend
      const formData = new FormData();
      formData.append('descriptors', JSON.stringify(descriptorArray));
      formData.append('accuracy', settings.faceRecognition.accuracy);

      await axios.post('/api/biometric/face/enroll', formData);
      
      stopFaceStream();
      setEnrollDialog({ open: false, type: null });
      await loadBiometricSettings();
      setSuccess('ফেস রিকগনিশন সফলভাবে সেটআপ হয়েছে');
    } catch (error) {
      console.error('Face capture error:', error);
      setError('ফেস রিকগনিশন সেটআপ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const stopFaceStream = () => {
    if (faceStream) {
      faceStream.getTracks().forEach(track => track.stop());
      setFaceStream(null);
    }
  };

  const startVoiceEnrollment = async () => {
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
          setLoading(true);
          const formData = new FormData();
          formData.append('voicePrint', JSON.stringify(mockVoicePrint));
          formData.append('phrase', 'আমার নাম বাংলা ভয়েস রিকগনিশন');
          formData.append('language', settings.voiceRecognition.language);
          formData.append('accuracy', settings.voiceRecognition.accuracy);
          formData.append('voiceAudio', audioBlob);

          await axios.post('/api/biometric/voice/enroll', formData);
          
          setEnrollDialog({ open: false, type: null });
          await loadBiometricSettings();
          setSuccess('ভয়েস রিকগনিশন সফলভাবে সেটআপ হয়েছে');
        } catch (error) {
          setError('ভয়েস রিকগনিশন সেটআপ করতে সমস্যা হয়েছে');
        } finally {
          setLoading(false);
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
      setError('মাইক্রোফোন অ্যাক্সেস পেতে সমস্যা হয়েছে');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Face authentication function for login
  const authenticateWithFace = async (userId) => {
    if (!videoRef.current || !faceApiLoaded) {
      setError('ফেস অ্যাপি লোড হয়নি');
      return null;
    }

    try {
      setLoading(true);
      const video = videoRef.current;
      
      // Detect faces using face-api.js
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setError('কোনো মুখ সনাক্ত করা যায়নি');
        return null;
      }

      if (detections.length > 1) {
        setError('একাধিক মুখ সনাক্ত করা হয়েছে');
        return null;
      }

      // Get face descriptor
      const descriptor = detections[0].descriptor;
      const descriptorArray = Array.from(descriptor);

      // Send to backend for authentication
      const response = await axios.post('/api/biometric/face/authenticate', {
        descriptors: JSON.stringify(descriptorArray),
        userId: userId
      });

      return response.data;
    } catch (error) {
      console.error('Face authentication error:', error);
      setError('ফেস অথেন্তিকেশনে সমস্যা হয়েছে');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      await axios.put('/api/biometric/preferences', { preferences: newPreferences });
      setSettings(prev => ({ ...prev, preferences: newPreferences }));
      setSuccess('প্রেফারেন্স আপডেট হয়েছে');
    } catch (error) {
      setError('প্রেফারেন্স আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const closeEnrollDialog = () => {
    setEnrollDialog({ open: false, type: null });
    stopFaceStream();
    stopVoiceRecording();
  };

  return (
    <div className="biometric-auth-container">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Face Recognition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaceRetouchingNatural />
              ফেস রিকগনিশন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.faceRecognition?.isEnabled || false}
                  onChange={(e) => toggleBiometric('face', e.target.checked)}
                />
              }
              label="ফেস রিকগনিশন সক্রিয় করুন"
            />
            
            {settings.faceRecognition?.isEnabled && (
              <Box mt={2}>
                <Typography variant="body2" gutterBottom>
                  নির্ভুলতা: {Math.round((settings.faceRecognition.accuracy || 0.85) * 100)}%
                </Typography>
                <Slider
                  value={settings.faceRecognition.accuracy || 0.85}
                  min={0.7}
                  max={1.0}
                  step={0.05}
                  onChange={(e, value) => {
                    setSettings(prev => ({
                      ...prev,
                      faceRecognition: { ...prev.faceRecognition, accuracy: value }
                    }));
                  }}
                />
                
                {settings.faceRecognition.enrollmentDate && (
                  <Typography variant="caption" display="block" mt={1}>
                    <CheckCircle fontSize="small" color="success" />
                    {' '}নিবন্ধন: {new Date(settings.faceRecognition.enrollmentDate).toLocaleDateString('bn-BD')}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Voice Recognition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RecordVoiceOver />
              ভয়েস রিকগনিশন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.voiceRecognition?.isEnabled || false}
                  onChange={(e) => toggleBiometric('voice', e.target.checked)}
                />
              }
              label="ভয়েস রিকগনিশন সক্রিয় করুন"
            />
            
            {settings.voiceRecognition?.isEnabled && (
              <Box mt={2}>
                <FormControl fullWidth size="small" margin="normal">
                  <InputLabel>ভাষা</InputLabel>
                  <Select
                    value={settings.voiceRecognition.language || 'bn-BD'}
                    label="ভাষা"
                    onChange={(e) => {
                      setSettings(prev => ({
                        ...prev,
                        voiceRecognition: { ...prev.voiceRecognition, language: e.target.value }
                      }));
                    }}
                  >
                    <MenuItem value="bn-BD">বাংলা</MenuItem>
                    <MenuItem value="en-US">English</MenuItem>
                  </Select>
                </FormControl>
                
                <Typography variant="body2" gutterBottom>
                  নির্ভুলতা: {Math.round((settings.voiceRecognition.accuracy || 0.8) * 100)}%
                </Typography>
                <Slider
                  value={settings.voiceRecognition.accuracy || 0.8}
                  min={0.7}
                  max={1.0}
                  step={0.05}
                  onChange={(e, value) => {
                    setSettings(prev => ({
                      ...prev,
                      voiceRecognition: { ...prev.voiceRecognition, accuracy: value }
                    }));
                  }}
                />
                
                {settings.voiceRecognition.enrollmentDate && (
                  <Typography variant="caption" display="block" mt={1}>
                    <CheckCircle fontSize="small" color="success" />
                    {' '}নিবন্ধন: {new Date(settings.voiceRecognition.enrollmentDate).toLocaleDateString('bn-BD')}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Fingerprint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint />
              ফিঙ্গারপ্রিন্ট
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.fingerprint?.isEnabled || false}
                  onChange={(e) => toggleBiometric('fingerprint', e.target.checked)}
                />
              }
              label="ফিঙ্গারপ্রিন্ট সক্রিয় করুন"
            />
            
            <Typography variant="body2" color="textSecondary" mt={1}>
              ব্রাউজার সাপোর্ট প্রয়োজন
            </Typography>
            
            {settings.fingerprint?.enrollmentDate && (
              <Typography variant="caption" display="block" mt={1}>
                <CheckCircle fontSize="small" color="success" />
                {' '}নিবন্ধন: {new Date(settings.fingerprint.enrollmentDate).toLocaleDateString('bn-BD')}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Security Preferences */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Security />
              নিরাপত্তা প্রেফারেন্স
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.preferences?.fallbackToPassword || false}
                    onChange={(e) => updatePreferences({
                      ...settings.preferences,
                      fallbackToPassword: e.target.checked
                    })}
                  />
                }
                label="পাসওয়ার্ডে ফ্যালব্যাক"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.preferences?.requireBiometricForSensitive || false}
                    onChange={(e) => updatePreferences({
                      ...settings.preferences,
                      requireBiometricForSensitive: e.target.checked
                    })}
                  />
                }
                label="গুরুত্বপূর্ণ কাজের জন্য বায়োমেট্রিক প্রয়োজন"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.preferences?.enableAntiSpoofing || false}
                    onChange={(e) => updatePreferences({
                      ...settings.preferences,
                      enableAntiSpoofing: e.target.checked
                    })}
                  />
                }
                label="অ্যান্টি-স্পুফিং সক্রিয় করুন"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Dialog */}
      <Dialog 
        open={enrollDialog.open} 
        onClose={closeEnrollDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {enrollDialog.type === 'face' && 'ফেস রিকগনিশন সেটআপ'}
          {enrollDialog.type === 'voice' && 'ভয়েস রিকগনিশন সেটআপ'}
          {enrollDialog.type === 'fingerprint' && 'ফিঙ্গারপ্রিন্ট সেটআপ'}
        </DialogTitle>
        
        <DialogContent>
          {enrollDialog.type === 'face' && (
            <Box>
              <Typography variant="body2" gutterBottom>
                আপনার মুখ ক্যামেরার সামনে রাখুন এবং ক্যাপচার করুন
              </Typography>
              
              <Box mt={2} textAlign="center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', maxWidth: '400px', borderRadius: '8px' }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
                
                <Box mt={2}>
                  {!faceStream ? (
                    <Button 
                      variant="contained" 
                      onClick={startFaceEnrollment}
                      startIcon={<FaceRetouchingNatural />}
                      disabled={!faceApiLoaded}
                    >
                      {faceApiLoaded ? 'ক্যামেরা চালু করুন' : 'ফেস মডেল লোড হচ্ছে...'}
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      onClick={captureFaceData}
                      disabled={loading || !faceApiLoaded}
                      startIcon={loading ? <CircularProgress size={20} /> : <FaceRetouchingNatural />}
                    >
                      {loading ? 'প্রসেসিং...' : 'মুখ ক্যাপচার করুন'}
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          )}
          
          {enrollDialog.type === 'voice' && (
            <Box>
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
                    onClick={startVoiceEnrollment}
                    startIcon={<RecordVoiceOver />}
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
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeEnrollDialog}>বাতিল</Button>
        </DialogActions>
      </Dialog>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
    </div>
  );
};

export default BiometricAuth;
