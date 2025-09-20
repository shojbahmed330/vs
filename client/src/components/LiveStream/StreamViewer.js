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
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Fullscreen,
  FullscreenExit,
  Visibility,
  ThumbUp,
  ThumbUpOutlined,
  Comment,
  VolumeUp,
  VolumeOff,
  Close
} from '@mui/icons-material';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../contexts/SocketContext';
import * as livestreamAPI from '../../api/livestream';
import StreamChat from './StreamChat';

const StreamViewer = ({ stream, onClose }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [agoraClient, setAgoraClient] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [viewerCount, setViewerCount] = useState(stream.currentViewers?.length || 0);
  const [likeCount, setLikeCount] = useState(stream.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(stream.comments?.length || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [streamData, setStreamData] = useState(stream);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    initializeViewer();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (socket && stream) {
      // Join stream room
      socket.emit('join_stream_room', { streamId: stream._id });
      
      // Listen for stream events
      socket.on('viewer:joined', handleViewerUpdate);
      socket.on('viewer:left', handleViewerUpdate);
      socket.on('comment:new', handleNewComment);
      socket.on('like:toggled', handleLikeToggled);
      socket.on('stream:ended', handleStreamEnded);
      
      return () => {
        socket.off('viewer:joined');
        socket.off('viewer:left');
        socket.off('comment:new');
        socket.off('like:toggled');
        socket.off('stream:ended');
        socket.emit('leave_stream_room', { streamId: stream._id });
      };
    }
  }, [socket, stream]);

  const initializeViewer = async () => {
    try {
      setLoading(true);
      
      // Check if user already liked this stream
      const isUserLiked = stream.likes?.some(like => like.user === user.id);
      setIsLiked(isUserLiked);
      
      // Create Agora client
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      
      // Set client role to audience
      await client.setClientRole('audience');
      
      // Listen for connection state changes
      client.on('connection-state-changed', (curState, revState) => {
        setConnectionState(curState);
      });
      
      // Listen for remote users
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        
        if (mediaType === 'video') {
          const remoteVideoTrack = user.videoTrack;
          if (videoRef.current) {
            remoteVideoTrack.play(videoRef.current);
          }
        }
        
        if (mediaType === 'audio') {
          const remoteAudioTrack = user.audioTrack;
          remoteAudioTrack.play();
        }
        
        setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      });
      
      client.on('user-unpublished', (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });
      
      setAgoraClient(client);
      
      // Join stream
      await joinStream(client);
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing viewer:', error);
      setError('Failed to join stream');
      setLoading(false);
    }
  };

  const joinStream = async (client = agoraClient) => {
    try {
      // Get join credentials from backend
      const joinData = await livestreamAPI.joinStream(stream._id);
      
      // Join Agora channel
      await client.join(
        joinData.appId,
        joinData.channelId,
        joinData.token,
        joinData.uid
      );
      
      setIsJoined(true);
      
      // Notify via socket
      if (socket) {
        socket.emit('join_live_stream', { streamId: stream._id });
      }
    } catch (error) {
      console.error('Error joining stream:', error);
      setError('Failed to join stream');
    }
  };

  const leaveStream = async () => {
    try {
      if (agoraClient && isJoined) {
        await agoraClient.leave();
        setIsJoined(false);
      }
      
      // Leave stream on backend
      await livestreamAPI.leaveStream(stream._id);
      
      // Notify via socket
      if (socket) {
        socket.emit('leave_live_stream', { streamId: stream._id });
      }
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  };

  const toggleLike = async () => {
    try {
      const response = await livestreamAPI.toggleStreamLike(stream._id);
      setIsLiked(response.isLiked);
      setLikeCount(response.likeCount);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleMute = () => {
    remoteUsers.forEach(user => {
      if (user.audioTrack) {
        if (isMuted) {
          user.audioTrack.play();
        } else {
          user.audioTrack.stop();
        }
      }
    });
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleViewerUpdate = (data) => {
    setViewerCount(data.viewerCount);
  };

  const handleNewComment = (data) => {
    setCommentCount(prev => prev + 1);
  };

  const handleLikeToggled = (data) => {
    setLikeCount(data.likeCount);
  };

  const handleStreamEnded = (data) => {
    if (data.streamId === stream._id) {
      setError('Stream has ended');
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  };

  const handleClose = async () => {
    await leaveStream();
    onClose();
  };

  const cleanup = async () => {
    try {
      await leaveStream();
      if (agoraClient) {
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
          Joining stream...
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
          <IconButton onClick={handleClose} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Avatar src={streamData.streamer.avatar} sx={{ mr: 2 }}>
            {streamData.streamer.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">{streamData.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              by {streamData.streamer.name}
            </Typography>
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

          <Chip
            label="LIVE"
            color="error"
            size="small"
            sx={{
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.7 },
                '100%': { opacity: 1 }
              }
            }}
          />

          <Chip
            label={connectionState}
            color={getConnectionStatusColor()}
            size="small"
            variant="outlined"
          />
        </Box>
      </Paper>

      {error && (
        <Alert 
          severity={error.includes('ended') ? 'info' : 'error'} 
          sx={{ mx: 2, mt: 1 }}
        >
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

            {/* No Stream Message */}
            {remoteUsers.length === 0 && isJoined && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: 'white'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Waiting for stream...
                </Typography>
                <CircularProgress color="inherit" />
              </Box>
            )}

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
                onClick={toggleMute}
                sx={{ color: 'white' }}
              >
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
              <IconButton
                onClick={toggleFullscreen}
                sx={{ color: 'white' }}
              >
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
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

          {/* Stream Actions */}
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              justifyContent: 'center',
              gap: 2
            }}
          >
            <Button
              variant={isLiked ? 'contained' : 'outlined'}
              startIcon={isLiked ? <ThumbUp /> : <ThumbUpOutlined />}
              onClick={toggleLike}
              color={isLiked ? 'primary' : 'inherit'}
            >
              {isLiked ? 'Liked' : 'Like'} ({likeCount})
            </Button>
          </Box>
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
    </Box>
  );
};

export default StreamViewer;
