import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Chip,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Fab
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Visibility,
  ThumbUp,
  Comment,
  Add,
  Live,
  VideoCall,
  Schedule,
  Public,
  People,
  Lock
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../contexts/SocketContext';
import * as livestreamAPI from '../../api/livestream';
import StreamViewer from '../../components/LiveStream/StreamViewer';
import StreamBroadcaster from '../../components/LiveStream/StreamBroadcaster';
import StreamCard from '../../components/LiveStream/StreamCard';
import CreateStreamDialog from '../../components/LiveStream/CreateStreamDialog';

const LiveStreamingPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [currentTab, setCurrentTab] = useState(0);
  const [streams, setStreams] = useState([]);
  const [myStreams, setMyStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingStream, setViewingStream] = useState(null);
  const [broadcastingStream, setBroadcastingStream] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Tab values
  const TAB_EXPLORE = 0;
  const TAB_MY_STREAMS = 1;
  const TAB_LIVE = 2;

  useEffect(() => {
    loadStreams();
    loadMyStreams();
    
    // Set up auto refresh every 30 seconds for live streams
    const interval = setInterval(() => {
      if (currentTab === TAB_EXPLORE || currentTab === TAB_LIVE) {
        loadStreams(true);
      }
    }, 30000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTab]);

  useEffect(() => {
    if (socket) {
      // Listen for stream events
      socket.on('stream:started', handleStreamStarted);
      socket.on('stream:ended', handleStreamEnded);
      socket.on('friend_live_stream', handleFriendLiveStream);
      
      return () => {
        socket.off('stream:started');
        socket.off('stream:ended');
        socket.off('friend_live_stream');
      };
    }
  }, [socket]);

  const loadStreams = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = currentTab === TAB_LIVE ? { status: 'live' } : {};
      const response = await livestreamAPI.getLiveStreams(params);
      setStreams(response.streams || []);
      setError(null);
    } catch (err) {
      console.error('Error loading streams:', err);
      if (!silent) setError('Failed to load streams');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMyStreams = async () => {
    try {
      const response = await livestreamAPI.getLiveStreams();
      const userStreams = response.streams?.filter(stream => 
        stream.streamer._id === user.id
      ) || [];
      setMyStreams(userStreams);
    } catch (err) {
      console.error('Error loading my streams:', err);
    }
  };

  const handleStreamStarted = (data) => {
    // Refresh streams when a new stream starts
    loadStreams(true);
    
    // Show notification if it's a friend's stream
    if (data.streamer._id !== user.id) {
      // Could add a toast notification here
      console.log(`${data.streamer.name} started a live stream: ${data.title}`);
    }
  };

  const handleStreamEnded = (data) => {
    // Refresh streams when a stream ends
    loadStreams(true);
    
    // If we're viewing this stream, close the viewer
    if (viewingStream && viewingStream._id === data.streamId) {
      setViewingStream(null);
    }
  };

  const handleFriendLiveStream = (data) => {
    // Show notification when a friend starts streaming
    // Could implement a toast notification here
    console.log(`Your friend ${data.streamerName} is now live: ${data.title}`);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCreateStream = async (streamData) => {
    try {
      const newStream = await livestreamAPI.createLiveStream(streamData);
      setMyStreams(prev => [newStream, ...prev]);
      setCreateDialogOpen(false);
      
      // Switch to My Streams tab to show the new stream
      setCurrentTab(TAB_MY_STREAMS);
      
      return newStream;
    } catch (err) {
      console.error('Error creating stream:', err);
      throw err;
    }
  };

  const handleStartBroadcast = (stream) => {
    setBroadcastingStream(stream);
    setViewingStream(null);
  };

  const handleStopBroadcast = () => {
    setBroadcastingStream(null);
    loadStreams(true);
    loadMyStreams();
  };

  const handleWatchStream = (stream) => {
    setViewingStream(stream);
    setBroadcastingStream(null);
  };

  const handleCloseViewer = () => {
    setViewingStream(null);
  };

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'public':
        return <Public fontSize="small" />;
      case 'friends':
        return <People fontSize="small" />;
      case 'private':
        return <Lock fontSize="small" />;
      default:
        return <Public fontSize="small" />;
    }
  };

  const getPrivacyColor = (privacy) => {
    switch (privacy) {
      case 'public':
        return 'success';
      case 'friends':
        return 'info';
      case 'private':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderStreamGrid = (streamList) => (
    <Grid container spacing={3}>
      {streamList.map((stream) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={stream._id}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StreamCard
              stream={stream}
              isOwner={stream.streamer._id === user.id}
              onWatch={() => handleWatchStream(stream)}
              onStartBroadcast={() => handleStartBroadcast(stream)}
              onRefresh={() => {
                loadStreams(true);
                loadMyStreams();
              }}
            />
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );

  if (broadcastingStream) {
    return (
      <StreamBroadcaster
        stream={broadcastingStream}
        onStop={handleStopBroadcast}
      />
    );
  }

  if (viewingStream) {
    return (
      <StreamViewer
        stream={viewingStream}
        onClose={handleCloseViewer}
      />
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Live sx={{ mr: 2, color: 'error.main' }} />
          Live Streaming
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Watch live streams from your friends or start your own broadcast
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab
            icon={<Public />}
            label="Explore"
            iconPosition="start"
          />
          <Tab
            icon={<VideoCall />}
            label="My Streams"
            iconPosition="start"
          />
          <Tab
            icon={
              <Badge
                badgeContent={streams.filter(s => s.status === 'live').length}
                color="error"
              >
                <Live />
              </Badge>
            }
            label="Live Now"
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <motion.div
            key={currentTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Explore Tab */}
            {currentTab === TAB_EXPLORE && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Discover Streams
                </Typography>
                {streams.length > 0 ? (
                  renderStreamGrid(streams)
                ) : (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="300px"
                    textAlign="center"
                  >
                    <Live sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No streams available
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Be the first to start streaming!
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* My Streams Tab */}
            {currentTab === TAB_MY_STREAMS && (
              <Box>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                >
                  <Typography variant="h6">
                    My Streams ({myStreams.length})
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                      background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
                      }
                    }}
                  >
                    Create Stream
                  </Button>
                </Box>
                
                {myStreams.length > 0 ? (
                  renderStreamGrid(myStreams)
                ) : (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="300px"
                    textAlign="center"
                  >
                    <VideoCall sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No streams created yet
                    </Typography>
                    <Typography variant="body2" color="text.disabled" mb={3}>
                      Create your first live stream to connect with your audience
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Create Your First Stream
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Live Now Tab */}
            {currentTab === TAB_LIVE && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Badge
                    badgeContent={streams.filter(s => s.status === 'live').length}
                    color="error"
                    sx={{ mr: 2 }}
                  >
                    <Live />
                  </Badge>
                  Live Streams
                </Typography>
                {streams.filter(s => s.status === 'live').length > 0 ? (
                  renderStreamGrid(streams.filter(s => s.status === 'live'))
                ) : (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="300px"
                    textAlign="center"
                  >
                    <Live sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No live streams right now
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Check back later or start your own stream!
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Quick Stream */}
      <Fab
        color="error"
        aria-label="start live stream"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
          '&:hover': {
            background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
          }
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Live />
      </Fab>

      {/* Create Stream Dialog */}
      <CreateStreamDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateStream}
      />
    </Container>
  );
};

export default LiveStreamingPage;
