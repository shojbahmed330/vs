import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardMedia,
  Avatar,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  Fab,
  LinearProgress,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Pause,
  ArrowBack,
  ArrowForward,
  Close,
  Favorite,
  FavoriteBorder,
  MoreVert,
  VolumeOff,
  VolumeUp
} from '@mui/icons-material';
import axios from 'axios';

const Stories = () => {
  const [storiesData, setStoriesData] = useState([]);
  const [currentStoryGroup, setCurrentStoryGroup] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    if (currentStoryGroup && isPlaying) {
      startStoryTimer();
    } else {
      stopStoryTimer();
    }
    
    return () => stopStoryTimer();
  }, [currentStoryGroup, currentStoryIndex, isPlaying]);

  const loadStories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stories/feed');
      setStoriesData(response.data);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStoryTimer = () => {
    stopStoryTimer();
    setProgress(0);
    
    const duration = 5000; // 5 seconds per story
    const interval = 50; // Update every 50ms
    let elapsed = 0;
    
    timerRef.current = setInterval(() => {
      elapsed += interval;
      const progressPercent = (elapsed / duration) * 100;
      setProgress(progressPercent);
      
      if (elapsed >= duration) {
        nextStory();
      }
    }, interval);
  };

  const stopStoryTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const openStoryGroup = (storyGroup, index = 0) => {
    setCurrentStoryGroup(storyGroup);
    setCurrentStoryIndex(index);
    setIsPlaying(true);
    
    // Mark story as viewed
    if (storyGroup.stories[index]) {
      markStoryAsViewed(storyGroup.stories[index]._id);
    }
  };

  const closeStoryViewer = () => {
    setCurrentStoryGroup(null);
    setCurrentStoryIndex(0);
    setIsPlaying(false);
    stopStoryTimer();
  };

  const nextStory = () => {
    if (!currentStoryGroup) return;
    
    const nextIndex = currentStoryIndex + 1;
    
    if (nextIndex < currentStoryGroup.stories.length) {
      setCurrentStoryIndex(nextIndex);
      markStoryAsViewed(currentStoryGroup.stories[nextIndex]._id);
    } else {
      // Move to next story group
      const currentGroupIndex = storiesData.findIndex(
        group => group.author._id === currentStoryGroup.author._id
      );
      
      if (currentGroupIndex < storiesData.length - 1) {
        const nextGroup = storiesData[currentGroupIndex + 1];
        openStoryGroup(nextGroup, 0);
      } else {
        closeStoryViewer();
      }
    }
  };

  const previousStory = () => {
    if (!currentStoryGroup) return;
    
    const prevIndex = currentStoryIndex - 1;
    
    if (prevIndex >= 0) {
      setCurrentStoryIndex(prevIndex);
    } else {
      // Move to previous story group
      const currentGroupIndex = storiesData.findIndex(
        group => group.author._id === currentStoryGroup.author._id
      );
      
      if (currentGroupIndex > 0) {
        const prevGroup = storiesData[currentGroupIndex - 1];
        openStoryGroup(prevGroup, prevGroup.stories.length - 1);
      }
    }
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

  const markStoryAsViewed = async (storyId) => {
    try {
      await axios.post(`/api/stories/${storyId}/view`);
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const reactToStory = async (storyId, reactionType) => {
    try {
      await axios.post(`/api/stories/${storyId}/react`, { reactionType });
      // Update local state to reflect the reaction
      setCurrentStoryGroup(prev => {
        const updatedStories = [...prev.stories];
        const storyIndex = updatedStories.findIndex(s => s._id === storyId);
        if (storyIndex !== -1) {
          // Update reaction (simplified - in real app you'd manage reactions properly)
          updatedStories[storyIndex].userReacted = reactionType;
        }
        return { ...prev, stories: updatedStories };
      });
    } catch (error) {
      console.error('Error reacting to story:', error);
    }
  };

  const handleCreateStory = () => {
    // Navigate to story creation
    window.location.href = '/stories/create';
  };

  const getCurrentStory = () => {
    if (!currentStoryGroup || !currentStoryGroup.stories[currentStoryIndex]) {
      return null;
    }
    return currentStoryGroup.stories[currentStoryIndex];
  };

  const renderStoryContent = (story) => {
    if (!story) return null;

    if (story.content.type === 'image') {
      return (
        <img
          src={story.content.url}
          alt="Story"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      );
    } else if (story.content.type === 'video') {
      return (
        <video
          ref={videoRef}
          src={story.content.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          autoPlay
          muted={muted}
          onEnded={nextStory}
        />
      );
    } else if (story.content.type === 'text') {
      return (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: story.content.backgroundColor || '#1877f2',
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
              color: story.content.textColor || '#fff',
              fontFamily: story.content.font || 'inherit',
              wordBreak: 'break-word'
            }}
          >
            {story.content.text}
          </Typography>
        </Box>
      );
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography>স্টোরি লোড হচ্ছে...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Stories Header */}
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {/* Create Story */}
        <Box sx={{ textAlign: 'center', minWidth: 80 }}>
          <Card
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px dashed #1877f2'
            }}
            onClick={handleCreateStory}
          >
            <Add color="primary" />
          </Card>
          <Typography variant="caption" display="block" mt={1}>
            আপনার স্টোরি
          </Typography>
        </Box>

        {/* Story Groups */}
        {storiesData.map((storyGroup) => (
          <Box key={storyGroup.author._id} sx={{ textAlign: 'center', minWidth: 80 }}>
            <Avatar
              src={storyGroup.author.avatar}
              sx={{
                width: 80,
                height: 80,
                cursor: 'pointer',
                border: storyGroup.hasUnseen ? '3px solid #1877f2' : '3px solid #e0e0e0'
              }}
              onClick={() => openStoryGroup(storyGroup)}
            />
            <Typography variant="caption" display="block" mt={1} noWrap>
              {storyGroup.author.fullName}
            </Typography>
            {storyGroup.hasUnseen && (
              <Chip
                label="নতুন"
                size="small"
                color="primary"
                sx={{ mt: 0.5, fontSize: '0.6rem', height: 16 }}
              />
            )}
          </Box>
        ))}
      </Box>

      {/* Story Viewer Dialog */}
      <Dialog
        open={!!currentStoryGroup}
        onClose={closeStoryViewer}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'black',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {currentStoryGroup && (
          <>
            {/* Progress Bars */}
            <Box sx={{ display: 'flex', gap: 0.5, p: 1 }}>
              {currentStoryGroup.stories.map((_, index) => (
                <LinearProgress
                  key={index}
                  variant="determinate"
                  value={
                    index < currentStoryIndex ? 100 :
                    index === currentStoryIndex ? progress :
                    0
                  }
                  sx={{
                    flex: 1,
                    height: 3,
                    bgcolor: 'rgba(255,255,255,0.3)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'white'
                    }
                  }}
                />
              ))}
            </Box>

            {/* Story Header */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 2, 
              color: 'white',
              position: 'absolute',
              top: 16,
              left: 0,
              right: 0,
              zIndex: 2
            }}>
              <Avatar src={currentStoryGroup.author.avatar} sx={{ mr: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">
                  {currentStoryGroup.author.fullName}
                </Typography>
                <Typography variant="caption">
                  {getCurrentStory() && new Date(getCurrentStory().createdAt).toLocaleTimeString('bn-BD')}
                </Typography>
              </Box>
              
              <IconButton color="inherit" onClick={togglePlayPause}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              
              {getCurrentStory()?.content.type === 'video' && (
                <IconButton color="inherit" onClick={() => setMuted(!muted)}>
                  {muted ? <VolumeOff /> : <VolumeUp />}
                </IconButton>
              )}
              
              <IconButton 
                color="inherit" 
                onClick={(e) => setMenuAnchor(e.currentTarget)}
              >
                <MoreVert />
              </IconButton>
              
              <IconButton color="inherit" onClick={closeStoryViewer}>
                <Close />
              </IconButton>
            </Box>

            {/* Story Content */}
            <DialogContent
              sx={{
                flex: 1,
                p: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
              onClick={togglePlayPause}
            >
              {renderStoryContent(getCurrentStory())}
              
              {/* Navigation Areas */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '30%',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  previousStory();
                }}
              />
              
              <Box
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '30%',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  nextStory();
                }}
              />
            </DialogContent>

            {/* Story Actions */}
            <Box sx={{ 
              position: 'absolute',
              bottom: 20,
              right: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <IconButton
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                }}
                onClick={() => reactToStory(getCurrentStory()?._id, 'like')}
              >
                {getCurrentStory()?.userReacted === 'like' ? 
                  <Favorite sx={{ color: 'red' }} /> : 
                  <FavoriteBorder />
                }
              </IconButton>
            </Box>

            {/* Menu */}
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={() => {
                // Report story
                setMenuAnchor(null);
              }}>
                রিপোর্ট করুন
              </MenuItem>
              <MenuItem onClick={() => {
                // Share story
                setMenuAnchor(null);
              }}>
                শেয়ার করুন
              </MenuItem>
            </Menu>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Stories;
