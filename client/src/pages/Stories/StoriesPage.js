import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  Fab,
  Tab,
  Tabs,
  Chip,
  Alert
} from '@mui/material';
import {
  Add,
  Close,
  CameraAlt,
  VideoCall,
  TextFields,
  Visibility,
  Favorite,
  Share
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Stories from '../../components/Stories/Stories';
import StoryCreator from '../../components/Stories/StoryCreator';
import StoryViewer from '../../components/Stories/StoryViewer';
import axios from 'axios';

const StoriesPage = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [storiesData, setStoriesData] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [archivedStories, setArchivedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [creatorType, setCreatorType] = useState('camera'); // camera, text, gallery
  const [selectedStory, setSelectedStory] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    loadStoriesData();
  }, []);

  const loadStoriesData = async () => {
    try {
      setLoading(true);
      const [feedResponse, myStoriesResponse, archivedResponse] = await Promise.all([
        axios.get('/api/stories/feed'),
        axios.get('/api/stories/my-stories'),
        axios.get('/api/stories/archived')
      ]);

      setStoriesData(feedResponse.data);
      setMyStories(myStoriesResponse.data);
      setArchivedStories(archivedResponse.data);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = (type) => {
    setCreatorType(type);
    setShowCreator(true);
  };

  const handleStoryCreated = (newStory) => {
    setMyStories(prev => [newStory, ...prev]);
    setShowCreator(false);
  };

  const handleStoryClick = (story) => {
    setSelectedStory(story);
    setShowViewer(true);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const renderStoryGrid = (stories, showStats = false) => (
    <Grid container spacing={2}>
      {stories.map((story) => (
        <Grid item xs={6} sm={4} md={3} key={story._id}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
            onClick={() => handleStoryClick(story)}
          >
            <Box
              sx={{
                position: 'relative',
                paddingTop: '177.78%', // 9:16 aspect ratio
                overflow: 'hidden'
              }}
            >
              {story.content.type === 'image' ? (
                <img
                  src={story.content.url}
                  alt="Story"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : story.content.type === 'video' ? (
                <video
                  src={story.content.url}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  muted
                />
              ) : (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: story.content.backgroundColor || '#1877f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2
                  }}
                >
                  <Typography
                    variant="h6"
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
              )}
              
              {/* Overlay with user info */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  p: 1
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar
                    src={story.author?.avatar}
                    sx={{ width: 24, height: 24 }}
                  >
                    {story.author?.firstName?.charAt(0)}
                  </Avatar>
                  <Typography variant="caption" sx={{ color: 'white' }}>
                    {story.author?.firstName}
                  </Typography>
                </Box>
                
                {showStats && (
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      size="small"
                      icon={<Visibility />}
                      label={story.views || 0}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                    <Chip
                      size="small"
                      icon={<Favorite />}
                      label={story.reactions?.length || 0}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  </Box>
                )}
              </Box>
              
              {/* Time indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'white' }}>
                  {getTimeAgo(story.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const getTimeAgo = (date) => {
    const now = new Date();
    const storyDate = new Date(date);
    const diffInHours = Math.floor((now - storyDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'এখনই';
    if (diffInHours < 24) return `${diffInHours}ঘ`;
    return `${Math.floor(diffInHours / 24)}দি`;
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 0: // সব স্টোরি
        return (
          <Box>
            {/* Create Story Options */}
            <Box mb={3}>
              <Typography variant="h6" mb={2}>
                আপনার স্টোরি
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Card
                    sx={{
                      width: 120,
                      height: 180,
                      cursor: 'pointer',
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1
                    }}
                    onClick={() => handleCreateStory('camera')}
                  >
                    <CameraAlt color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="caption" align="center">
                      ক্যামেরা
                    </Typography>
                  </Card>
                </Grid>
                <Grid item>
                  <Card
                    sx={{
                      width: 120,
                      height: 180,
                      cursor: 'pointer',
                      border: '2px dashed',
                      borderColor: 'secondary.main',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1
                    }}
                    onClick={() => handleCreateStory('text')}
                  >
                    <TextFields color="secondary" sx={{ fontSize: 32 }} />
                    <Typography variant="caption" align="center">
                      টেক্সট
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Stories Feed */}
            {storiesData.length > 0 ? (
              <Stories />
            ) : (
              <Alert severity="info">
                কোনো স্টোরি নেই। প্রথম স্টোরি তৈরি করুন!
              </Alert>
            )}
          </Box>
        );
        
      case 1: // আমার স্টোরি
        return (
          <Box>
            {myStories.length > 0 ? (
              renderStoryGrid(myStories, true)
            ) : (
              <Alert severity="info">
                আপনার কোনো স্টোরি নেই। এখনই তৈরি করুন!
              </Alert>
            )}
          </Box>
        );
        
      case 2: // আর্কাইভ
        return (
          <Box>
            {archivedStories.length > 0 ? (
              renderStoryGrid(archivedStories, true)
            ) : (
              <Alert severity="info">
                আর্কাইভে কোনো স্টোরি নেই।
              </Alert>
            )}
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4">
          স্টোরি
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="সব স্টোরি" />
          <Tab label="আমার স্টোরি" />
          <Tab label="আর্কাইভ" />
        </Tabs>
      </Box>

      {/* Content */}
      {renderTabContent()}

      {/* Create Story FAB */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          '@media (max-width: 600px)': {
            bottom: 80,
          }
        }}
        onClick={() => handleCreateStory('camera')}
      >
        <Add />
      </Fab>

      {/* Story Creator Dialog */}
      <Dialog
        open={showCreator}
        onClose={() => setShowCreator(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogContent sx={{ p: 0 }}>
          <Box position="relative">
            <IconButton
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1000,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white'
              }}
              onClick={() => setShowCreator(false)}
            >
              <Close />
            </IconButton>
            <StoryCreator
              type={creatorType}
              onStoryCreated={handleStoryCreated}
              onClose={() => setShowCreator(false)}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog
        open={showViewer}
        onClose={() => setShowViewer(false)}
        maxWidth="sm"
        fullWidth
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'black',
            margin: 0,
            maxHeight: '100vh'
          }
        }}
      >
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {selectedStory && (
            <StoryViewer
              story={selectedStory}
              onClose={() => setShowViewer(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default StoriesPage;
