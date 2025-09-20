import React, { useState } from 'react';
import {
  Box,
  Card,
  Avatar,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogContent
} from '@mui/material';
import {
  Add as AddIcon,
  Play as PlayIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useAuth } from '../../contexts/AuthContext';

const Stories = () => {
  const { user } = useAuth();
  const [selectedStory, setSelectedStory] = useState(null);
  const [storyDialog, setStoryDialog] = useState(false);

  // Mock stories data - in real app, this would come from API
  const stories = [
    {
      id: 1,
      user: {
        _id: '1',
        fullName: 'John Doe',
        username: 'johndoe',
        avatar: ''
      },
      media: {
        type: 'image',
        url: 'https://via.placeholder.com/400x600/4267B2/white?text=Story+1',
        thumbnail: 'https://via.placeholder.com/100x100/4267B2/white?text=S1'
      },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      viewed: false
    },
    {
      id: 2,
      user: {
        _id: '2',
        fullName: 'Jane Smith',
        username: 'janesmith',
        avatar: ''
      },
      media: {
        type: 'video',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4',
        thumbnail: 'https://via.placeholder.com/100x100/42b883/white?text=S2'
      },
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      viewed: true
    }
  ];

  const handleCreateStory = () => {
    // Open story creation dialog
    console.log('Create story');
  };

  const handleStoryClick = (story) => {
    setSelectedStory(story);
    setStoryDialog(true);
  };

  const StoryItem = ({ story, isCreateStory = false }) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          minWidth: 100
        }}
        onClick={isCreateStory ? handleCreateStory : () => handleStoryClick(story)}
      >
        <Box
          sx={{
            position: 'relative',
            mb: 1
          }}
        >
          {isCreateStory ? (
            <Card
              sx={{
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'background.default',
                border: '2px dashed',
                borderColor: 'primary.main'
              }}
            >
              <AddIcon color="primary" />
            </Card>
          ) : (
            <>
              <Avatar
                src={story.media.thumbnail}
                sx={{
                  width: 80,
                  height: 80,
                  border: story.viewed ? '3px solid #e0e0e0' : '3px solid #4267B2'
                }}
              >
                {story.user.fullName.charAt(0)}
              </Avatar>
              
              {story.media.type === 'video' && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 5,
                    right: 5,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PlayIcon sx={{ color: 'white', fontSize: 16 }} />
                </Box>
              )}
            </>
          )}
        </Box>
        
        <Typography
          variant="caption"
          textAlign="center"
          sx={{
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {isCreateStory ? 'Your Story' : story.user.fullName}
        </Typography>
      </Box>
    </motion.div>
  );

  return (
    <>
      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Stories
        </Typography>
        
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 6
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: 3
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: 3
            }
          }}
        >
          {/* Create Story */}
          <StoryItem isCreateStory={true} />
          
          {/* Stories List */}
          {stories.map((story) => (
            <StoryItem key={story.id} story={story} />
          ))}
        </Box>
      </Card>

      {/* Story Viewer Dialog */}
      <Dialog
        open={storyDialog}
        onClose={() => setStoryDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'black',
            borderRadius: 3
          }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {selectedStory && (
            <Box>
              {/* Story Header */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  p: 2,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Avatar src={selectedStory.user.avatar} sx={{ width: 40, height: 40 }}>
                  {selectedStory.user.fullName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="white" fontWeight="bold">
                    {selectedStory.user.fullName}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    {new Date(selectedStory.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>

              {/* Story Content */}
              <Box
                sx={{
                  width: '100%',
                  height: '70vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {selectedStory.media.type === 'image' ? (
                  <img
                    src={selectedStory.media.url}
                    alt="Story"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <video
                    src={selectedStory.media.url}
                    controls
                    autoPlay
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Stories;