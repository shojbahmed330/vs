import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  LinearProgress,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  Close,
  ArrowBack,
  ArrowForward,
  Favorite,
  FavoriteBorder,
  Send,
  MoreVert,
  VolumeOff,
  VolumeUp,
  Pause,
  PlayArrow
} from '@mui/icons-material';
import axios from 'axios';

const StoryViewer = ({ story, onClose, onNext, onPrevious }) => {
  const [currentStory, setCurrentStory] = useState(story);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);

  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const duration = 5000; // 5 seconds for images/text, auto for videos

  useEffect(() => {
    setCurrentStory(story);
    setProgress(0);
    setIsLiked(story.userReacted === 'like');
    
    // Mark story as viewed
    markAsViewed();
    
    if (isPlaying) {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [story]);

  useEffect(() => {
    if (isPlaying && currentStory.content.type !== 'video') {
      startTimer();
    } else {
      stopTimer();
    }
  }, [isPlaying]);

  const startTimer = () => {
    stopTimer();
    
    if (currentStory.content.type === 'video') {
      // For videos, let the video control the progress
      return;
    }
    
    const interval = 50;
    let elapsed = 0;
    
    timerRef.current = setInterval(() => {
      elapsed += interval;
      const progressPercent = (elapsed / duration) * 100;
      setProgress(progressPercent);
      
      if (elapsed >= duration) {
        handleNext();
      }
    }, interval);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const markAsViewed = async () => {
    try {
      await axios.post(`/api/stories/${currentStory._id}/view`);
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const handleLike = async () => {
    try {
      const action = isLiked ? 'unlike' : 'like';
      await axios.post(`/api/stories/${currentStory._id}/react`, { 
        reactionType: action 
      });
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error reacting to story:', error);
    }
  };

  const sendMessage = async () => {
    if (!comment.trim()) return;
    
    try {
      await axios.post(`/api/stories/${currentStory._id}/reply`, {
        message: comment
      });
      setComment('');
      // Show success message or handle as needed
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const progressPercent = (video.currentTime / video.duration) * 100;
      setProgress(progressPercent);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const loadViewers = async () => {
    try {
      const response = await axios.get(`/api/stories/${currentStory._id}/viewers`);
      setViewers(response.data.viewers || []);
      setShowViewers(true);
    } catch (error) {
      console.error('Error loading viewers:', error);
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const storyDate = new Date(date);
    const diffInHours = Math.floor((now - storyDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'এখনই';
    if (diffInHours < 24) return `${diffInHours}ঘ আগে`;
    return `${Math.floor(diffInHours / 24)}দিন আগে`;
  };

  const renderStoryContent = () => {
    if (currentStory.content.type === 'image') {
      return (
        <img
          src={currentStory.content.url}
          alt="Story"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      );
    } else if (currentStory.content.type === 'video') {
      return (
        <video
          ref={videoRef}
          src={currentStory.content.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          autoPlay
          muted={isMuted}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={handleVideoEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      );
    } else if (currentStory.content.type === 'text') {
      return (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: currentStory.content.backgroundColor || '#1877f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3
          }}
        >
          <Typography
            variant="h4"
            align="center"
            sx={{
              color: currentStory.content.textColor || '#fff',
              fontFamily: currentStory.content.font || 'inherit',
              fontSize: currentStory.content.fontSize || 24,
              wordBreak: 'break-word'
            }}
          >
            {currentStory.content.text}
          </Typography>
        </Box>
      );
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        bgcolor: 'black',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 3,
          bgcolor: 'rgba(255,255,255,0.3)',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'white'
          }
        }}
      />

      {/* Header */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Avatar
          src={currentStory.author?.avatar}
          sx={{ width: 32, height: 32 }}
        >
          {currentStory.author?.firstName?.charAt(0)}
        </Avatar>
        
        <Box flex={1}>
          <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
            {currentStory.author?.firstName} {currentStory.author?.lastName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {getTimeAgo(currentStory.createdAt)}
          </Typography>
        </Box>

        {/* Story Controls */}
        <Box display="flex" gap={1}>
          {currentStory.content.type === 'video' && (
            <>
              <IconButton
                size="small"
                onClick={togglePlayPause}
                sx={{ color: 'white' }}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              
              <IconButton
                size="small"
                onClick={toggleMute}
                sx={{ color: 'white' }}
              >
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
            </>
          )}
          
          <IconButton
            size="small"
            onClick={loadViewers}
            sx={{ color: 'white' }}
          >
            <MoreVert />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>

      {/* Navigation Areas */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '30%',
          height: '100%',
          zIndex: 100,
          cursor: 'pointer'
        }}
        onClick={handlePrevious}
      />
      
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '30%',
          height: '100%',
          zIndex: 100,
          cursor: 'pointer'
        }}
        onClick={handleNext}
      />

      {/* Story Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={togglePlayPause}
      >
        {renderStoryContent()}
      </Box>

      {/* Bottom Actions */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <TextField
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="একটি বার্তা পাঠান..."
          variant="outlined"
          size="small"
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.9)',
              borderRadius: 3
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={sendMessage}
                  disabled={!comment.trim()}
                >
                  <Send />
                </IconButton>
              </InputAdornment>
            )
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
        />
        
        <IconButton
          onClick={handleLike}
          sx={{
            bgcolor: 'rgba(255,255,255,0.9)',
            color: isLiked ? 'red' : 'black',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.8)'
            }
          }}
        >
          {isLiked ? <Favorite /> : <FavoriteBorder />}
        </IconButton>
      </Box>

      {/* Navigation Hints */}
      {onPrevious && (
        <IconButton
          sx={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)',
            zIndex: 50
          }}
        >
          <ArrowBack />
        </IconButton>
      )}
      
      {onNext && (
        <IconButton
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)',
            zIndex: 50
          }}
        >
          <ArrowForward />
        </IconButton>
      )}

      {/* Viewers Dialog */}
      <Dialog
        open={showViewers}
        onClose={() => setShowViewers(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box p={2}>
          <Typography variant="h6" mb={2}>
            দেখেছেন ({viewers.length})
          </Typography>
          <List>
            {viewers.map((viewer) => (
              <ListItem key={viewer._id}>
                <ListItemAvatar>
                  <Avatar src={viewer.avatar}>
                    {viewer.firstName?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${viewer.firstName} ${viewer.lastName}`}
                  secondary={viewer.username}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Dialog>
    </Box>
  );
};

export default StoryViewer;
