import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  Stop,
  Settings,
  Fullscreen,
  FullscreenExit,
  Visibility,
  ThumbUp,
  Comment,
  Close
} from '@mui/icons-material';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../contexts/SocketContext';
import * as livestreamAPI from '../../api/livestream';
import StreamChat from './StreamChat';
import StreamAnalytics from './StreamAnalytics';

const StreamBroadcaster = ({ stream, onStop }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [agoraClient, setAgoraClient] = useState(null);
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(stream.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(stream.comments?.length || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    initializeAgora();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (socket && stream) {
      // Join stream room
      socket.emit('join_stream_room', { streamId: stream._id });
      
      // Listen for viewer events
      socket.on('viewer_joined', handleViewerJoined);
      socket.on('viewer_left', handleViewerLeft);
      socket.on('comment:new', handleNewComment);
      socket.on('like:toggled', handleLikeToggled);
      
      return () => {
        socket.off('viewer_joined');
        socket.off('viewer_left');
        socket.off('comment:new');
        socket.off('like:toggled');
        socket.emit('leave_stream_room', { streamId: stream._id });
      };
    }
  }, [socket, stream]);

  const initializeAgora = async () => {
    try {
      setLoading(true);
      
      // Create Agora client
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      
      // Set client role to host
      await client.setClientRole('host');
      
      // Listen for connection state changes
      client.on('connection-state-changed', (curState, revState) => {
        setConnectionState(curState);
      });
      
      setAgoraClient(client);
      
      // Create local tracks
      await createLocalTracks();
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing Agora:', error);
      setError('Failed to initialize streaming');
      setLoading(false);
    }
  };

  const createLocalTracks = async () => {
    try {
      const [videoTrack, audioTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      
      setLocalTracks({ video: videoTrack, audio: audioTrack });
      
      // Play video track locally
      if (videoRef.current) {
        videoTrack.play(videoRef.current);
      }
    } catch (error) {
      console.error('Error creating local tracks:', error);
      setError('Failed to access camera/microphone');
    }
  };

  const startStreaming = async () => {
    if (!agoraClient || !localTracks.video || !localTracks.audio) {
      setError('Streaming not ready');
      return;
    }

    try {
      setLoading(true);
      
      // Start the stream on backend
      const updatedStream = await livestreamAPI.startStream(stream._id);
      
      // Join Agora channel
      await agoraClient.join(
        process.env.REACT_APP_AGORA_APP_ID,
        stream.agoraChannelId,
        stream.agoraToken,
        parseInt(user.id.slice(-6), 16)
      );
      
      // Publish local tracks
      await agoraClient.publish([localTracks.video, localTracks.audio]);
      
      setIsStreaming(true);
      setViewerCount(updatedStream.currentViewers?.length || 0);
      
      // Notify via socket
      if (socket) {
        socket.emit('start_live_stream', {
          streamId: stream._id,
          title: stream.title
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error starting stream:', error);
      setError('Failed to start streaming');
      setLoading(false);
    }
  };

  const stopStreaming = async () => {
    try {
      if (agoraClient) {
        await agoraClient.unpublish();
        await agoraClient.leave();
      }
      
      // End stream on backend
      await livestreamAPI.endStream(stream._id);
      
      // Notify via socket
      if (socket) {
        socket.emit('end_live_stream', { streamId: stream._id });
      }
      
      setIsStreaming(false);
      onStop();
    } catch (error) {
      console.error('Error stopping stream:', error);
      setError('Failed to stop streaming');
    }
  };

  const toggleVideo = async () => {
    if (localTracks.video) {
      if (isVideoEnabled) {
        await localTracks.video.setEnabled(false);
      } else {
        await localTracks.video.setEnabled(true);
      }
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localTracks.audio) {
      if (isAudioEnabled) {
        await localTracks.audio.setEnabled(false);
      } else {
        await localTracks.audio.setEnabled(true);
      }
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleViewerJoined = (data) => {
    setViewerCount(prev => prev + 1);
  };

  const handleViewerLeft = (data) => {
    setViewerCount(prev => Math.max(0, prev - 1));
  };

  const handleNewComment = (data) => {
    setCommentCount(prev => prev + 1);
  };

  const handleLikeToggled = (data) => {
    setLikeCount(data.likeCount);
  };

  const cleanup = async () => {
    try {
      if (localTracks.video) {
        localTracks.video.stop();
        localTracks.video.close();
      }
      if (localTracks.audio) {
        localTracks.audio.stop();
        localTracks.audio.close();
      }
      if (agoraClient) {
        await agoraClient.unpublish();
        await agoraClient.leave();
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return 'success';
      case 'CONNECTING':
        return 'warning';
      case 'DISCONNECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Setting up your stream...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar src={user.avatar} sx={{ mr: 2 }}>
            {user.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">{stream.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={isStreaming ? 'LIVE' : 'PREPARING'}
                color={isStreaming ? 'error' : 'warning'}
                size="small"
                sx={{
                  ...(isStreaming && {
                    animation: 'pulse 2s infinite',
                  })
                }}
              />
              <Chip
                label={connectionState}
                color={getConnectionStatusColor()}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Stream Stats */}
          <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
            <Tooltip title="Viewers">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Visibility sx={{ fontSize: 20, mr: 0.5 }} />
                <Typography variant="body2">{viewerCount}</Typography>
              </Box>
            </Tooltip>
            <Tooltip title="Likes">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ThumbUp sx={{ fontSize: 20, mr: 0.5 }} />
                <Typography variant="body2">{likeCount}</Typography>
              </Box>
            </Tooltip>
            <Tooltip title="Comments">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Comment sx={{ fontSize: 20, mr: 0.5 }} />
                <Typography variant="body2">{commentCount}</Typography>
              </Box>
            </Tooltip>
          </Box>

          <IconButton onClick={toggleFullscreen}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>

          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={() => setShowStopDialog(true)}
            disabled={!isStreaming}
          >
            End Stream
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', p: 2, gap: 2 }}>
        {/* Video Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper
            elevation={3}
            sx={{
              flexGrow: 1,
              position: 'relative',
              bgcolor: 'black',
              borderRadius: 2,
              overflow: 'hidden',
              minHeight: '60vh'
            }}
          >
            {/* Video Element */}
            <div
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />

            {/* Video Controls Overlay */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 1,
                bgcolor: 'rgba(0,0,0,0.7)',
                borderRadius: 2,
                p: 1
              }}
            >
              <IconButton
                onClick={toggleVideo}
                color={isVideoEnabled ? 'primary' : 'error'}
                sx={{ color: 'white' }}
              >
                {isVideoEnabled ? <Videocam /> : <VideocamOff />}
              </IconButton>
              <IconButton
                onClick={toggleAudio}
                color={isAudioEnabled ? 'primary' : 'error'}
                sx={{ color: 'white' }}
              >
                {isAudioEnabled ? <Mic /> : <MicOff />}
              </IconButton>
            </Box>

            {/* Connection Status */}
            {connectionState !== 'CONNECTED' && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 1
                }}
              >
                <Typography variant="caption">
                  {connectionState}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Start Stream Button */}
          {!isStreaming && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<Videocam />}
                onClick={startStreaming}
                disabled={loading || connectionState !== 'DISCONNECTED'}
                sx={{
                  background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                  fontSize: '1.2rem',
                  py: 1.5,
                  px: 4,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
                  }
                }}
              >
                Go Live
              </Button>
            </Box>
          )}
        </Box>

        {/* Chat Sidebar */}
        <Paper
          elevation={3}
          sx={{
            width: 350,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2
          }}
        >
          <StreamChat streamId={stream._id} />
        </Paper>
      </Box>

      {/* Stop Stream Dialog */}
      <Dialog open={showStopDialog} onClose={() => setShowStopDialog(false)}>
        <DialogTitle>End Live Stream?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to end your live stream? Your viewers will be disconnected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStopDialog(false)}>Cancel</Button>
          <Button onClick={stopStreaming} color="error" variant="contained">
            End Stream
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StreamBroadcaster;
