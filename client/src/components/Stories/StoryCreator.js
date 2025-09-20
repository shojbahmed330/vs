import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  TextField,
  Card,
  Slider,
  Grid,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  PhotoCamera,
  Videocam,
  FlipCameraIos,
  Send,
  Palette,
  FormatSize,
  Close,
  Download
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import axios from 'axios';

const StoryCreator = ({ type = 'camera', onStoryCreated, onClose }) => {
  const [mode, setMode] = useState(type); // camera, text, gallery
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#1877f2');
  const [fontSize, setFontSize] = useState(24);
  const [facingMode, setFacingMode] = useState('user');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const backgroundColors = [
    '#1877f2', '#ff6b6b', '#4ecdc4', '#45b7d1',
    '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#00d2d3', '#ff9f43', '#ee5a24'
  ];

  const textColors = [
    '#ffffff', '#000000', '#ff6b6b', '#4ecdc4',
    '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'
  ];

  useEffect(() => {
    return () => {
      // Cleanup
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  };

  const startVideoRecording = async () => {
    try {
      const stream = webcamRef.current.stream;
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      });

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        setRecordedChunks(chunks);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Auto stop after 15 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopVideoRecording();
        }
      }, 15000);
    } catch (error) {
      setError('ভিডিও রেকর্ডিং শুরু করতে সমস্যা হয়েছে');
      console.error('Error starting video recording:', error);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const switchCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setCapturedImage(e.target.result);
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setRecordedVideo(url);
      }
    }
  };

  const uploadStory = async () => {
    try {
      setUploading(true);
      setError('');

      let storyData = {};

      if (mode === 'text') {
        storyData = {
          content: {
            type: 'text',
            text: textContent,
            textColor,
            backgroundColor,
            fontSize
          }
        };
      } else if (capturedImage) {
        // Convert image to blob and upload
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('file', blob, 'story-image.jpg');
        formData.append('type', 'image');

        const uploadResponse = await axios.post('/api/stories/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        storyData = {
          content: {
            type: 'image',
            url: uploadResponse.data.url
          }
        };
      } else if (recordedVideo) {
        // Convert video to blob and upload
        const response = await fetch(recordedVideo);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('file', blob, 'story-video.webm');
        formData.append('type', 'video');

        const uploadResponse = await axios.post('/api/stories/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        storyData = {
          content: {
            type: 'video',
            url: uploadResponse.data.url
          }
        };
      } else {
        setError('কোনো কন্টেন্ট নেই');
        return;
      }

      // Create story
      const createResponse = await axios.post('/api/stories', storyData);
      
      if (onStoryCreated) {
        onStoryCreated(createResponse.data);
      }
    } catch (error) {
      setError('স্টোরি আপলোড করতে সমস্যা হয়েছে');
      console.error('Error uploading story:', error);
    } finally {
      setUploading(false);
    }
  };

  const renderCameraMode = () => (
    <Box>
      {!capturedImage && !recordedVideo ? (
        <Box position="relative">
          <Webcam
            ref={webcamRef}
            audio={true}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode
            }}
            style={{
              width: '100%',
              height: '400px',
              objectFit: 'cover'
            }}
          />
          
          {/* Camera Controls */}
          <Box
            position="absolute"
            bottom={16}
            left="50%"
            transform="translateX(-50%)"
            display="flex"
            gap={2}
            alignItems="center"
          >
            <IconButton
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white'
              }}
              onClick={switchCamera}
            >
              <FlipCameraIos />
            </IconButton>
            
            <IconButton
              sx={{
                bgcolor: 'white',
                width: 64,
                height: 64,
                '&:hover': { bgcolor: 'white' }
              }}
              onClick={capturePhoto}
            >
              <PhotoCamera sx={{ fontSize: 32 }} />
            </IconButton>
            
            <IconButton
              sx={{
                bgcolor: isRecording ? 'red' : 'rgba(255,255,255,0.2)',
                color: 'white'
              }}
              onClick={isRecording ? stopVideoRecording : startVideoRecording}
            >
              <Videocam />
            </IconButton>
          </Box>

          {isRecording && (
            <Box
              position="absolute"
              top={16}
              left="50%"
              transform="translateX(-50%)"
              display="flex"
              alignItems="center"
              gap={1}
              bgcolor="red"
              color="white"
              px={2}
              py={1}
              borderRadius={1}
            >
              <Box
                width={8}
                height={8}
                bgcolor="white"
                borderRadius="50%"
                sx={{
                  animation: 'blink 1s infinite'
                }}
              />
              <Typography variant="body2">রেকর্ড হচ্ছে</Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Box position="relative">
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              style={{
                width: '100%',
                height: '400px',
                objectFit: 'cover'
              }}
            />
          )}
          
          {recordedVideo && (
            <video
              src={recordedVideo}
              controls
              style={{
                width: '100%',
                height: '400px',
                objectFit: 'cover'
              }}
            />
          )}
          
          <Box
            position="absolute"
            bottom={16}
            left="50%"
            transform="translateX(-50%)"
            display="flex"
            gap={2}
          >
            <Button
              variant="outlined"
              sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
              onClick={() => {
                setCapturedImage(null);
                setRecordedVideo(null);
              }}
            >
              আবার নিন
            </Button>
            
            <Button
              variant="contained"
              onClick={uploadStory}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <Send />}
            >
              পোস্ট করুন
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );

  const renderTextMode = () => (
    <Box>
      <Box
        sx={{
          width: '100%',
          height: '400px',
          background: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          p: 2
        }}
      >
        <TextField
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="আপনার মনের কথা লিখুন..."
          multiline
          variant="standard"
          InputProps={{
            disableUnderline: true,
            style: {
              color: textColor,
              fontSize: fontSize,
              textAlign: 'center',
              fontWeight: 'bold'
            }
          }}
          sx={{
            '& .MuiInputBase-input': {
              textAlign: 'center'
            },
            '& .MuiInputBase-input::placeholder': {
              color: textColor,
              opacity: 0.7
            }
          }}
        />
      </Box>
      
      {/* Text Controls */}
      <Box p={2}>
        <Typography variant="subtitle2" gutterBottom>
          ব্যাকগ্রাউন্ড রঙ
        </Typography>
        <Box display="flex" gap={1} mb={2}>
          {backgroundColors.map((color) => (
            <Box
              key={color}
              width={32}
              height={32}
              bgcolor={color}
              borderRadius="50%"
              border={backgroundColor === color ? '3px solid white' : 'none'}
              sx={{ cursor: 'pointer' }}
              onClick={() => setBackgroundColor(color)}
            />
          ))}
        </Box>
        
        <Typography variant="subtitle2" gutterBottom>
          টেক্সট রঙ
        </Typography>
        <Box display="flex" gap={1} mb={2}>
          {textColors.map((color) => (
            <Box
              key={color}
              width={32}
              height={32}
              bgcolor={color}
              borderRadius="50%"
              border={textColor === color ? '3px solid #1877f2' : '1px solid #ddd'}
              sx={{ cursor: 'pointer' }}
              onClick={() => setTextColor(color)}
            />
          ))}
        </Box>
        
        <Typography variant="subtitle2" gutterBottom>
          ফন্ট সাইজ
        </Typography>
        <Slider
          value={fontSize}
          onChange={(e, value) => setFontSize(value)}
          min={16}
          max={48}
          valueLabelDisplay="auto"
        />
        
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          onClick={uploadStory}
          disabled={!textContent.trim() || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <Send />}
        >
          পোস্ট করুন
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Mode Selector */}
      <Box display="flex" justifyContent="center" gap={1} p={2} bgcolor="background.paper">
        <Button
          variant={mode === 'camera' ? 'contained' : 'outlined'}
          onClick={() => setMode('camera')}
          startIcon={<PhotoCamera />}
        >
          ক্যামেরা
        </Button>
        <Button
          variant={mode === 'text' ? 'contained' : 'outlined'}
          onClick={() => setMode('text')}
          startIcon={<FormatSize />}
        >
          টেক্সট
        </Button>
        <Button
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          startIcon={<Download />}
        >
          গ্যালারি
        </Button>
      </Box>
      
      {/* Content */}
      {mode === 'camera' && renderCameraMode()}
      {mode === 'text' && renderTextMode()}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </Box>
  );
};

export default StoryCreator;
