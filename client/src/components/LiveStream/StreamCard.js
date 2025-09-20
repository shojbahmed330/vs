import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Avatar,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Badge
} from '@mui/material';
import {
  PlayArrow,
  Visibility,
  ThumbUp,
  Comment,
  Public,
  People,
  Lock,
  Live,
  Schedule,
  Stop
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const StreamCard = ({ 
  stream, 
  isOwner = false, 
  onWatch, 
  onStartBroadcast, 
  onRefresh 
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'live':
        return 'error';
      case 'scheduled':
        return 'warning';
      case 'ended':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'live':
        return 'LIVE';
      case 'scheduled':
        return 'SCHEDULED';
      case 'ended':
        return 'ENDED';
      default:
        return status.toUpperCase();
    }
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

  const getTimeText = () => {
    if (stream.status === 'live' && stream.actualStartTime) {
      return `Started ${formatDistanceToNow(new Date(stream.actualStartTime))} ago`;
    } else if (stream.status === 'scheduled' && stream.scheduledStartTime) {
      return `Scheduled for ${formatDistanceToNow(new Date(stream.scheduledStartTime))}`;
    } else if (stream.status === 'ended' && stream.endTime) {
      return `Ended ${formatDistanceToNow(new Date(stream.endTime))} ago`;
    }
    return '';
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            boxShadow: theme => theme.shadows[8],
          }
        }}
      >
        {/* Thumbnail */}
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="div"
            sx={{
              height: 200,
              background: stream.thumbnail 
                ? `url(${stream.thumbnail})` 
                : 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {!stream.thumbnail && (
              <Live sx={{ fontSize: 64, color: 'rgba(255,255,255,0.8)' }} />
            )}
          </CardMedia>

          {/* Status Badge */}
          <Chip
            label={getStatusText(stream.status)}
            color={getStatusColor(stream.status)}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              fontWeight: 'bold',
              ...(stream.status === 'live' && {
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                  '100%': { opacity: 1 }
                }
              })
            }}
          />

          {/* Privacy Badge */}
          <Chip
            icon={getPrivacyIcon(stream.privacy)}
            label={stream.privacy}
            size="small"
            variant="outlined"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)'
            }}
          />

          {/* Viewer Count (for live streams) */}
          {stream.status === 'live' && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.875rem'
              }}
            >
              <Visibility sx={{ fontSize: 16, mr: 0.5 }} />
              {stream.currentViewers?.length || 0}
            </Box>
          )}
        </Box>

        {/* Content */}
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Streamer Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              src={stream.streamer.avatar}
              alt={stream.streamer.name}
              sx={{ width: 40, height: 40, mr: 1.5 }}
            >
              {stream.streamer.name.charAt(0)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{ fontWeight: 600 }}
              >
                {stream.streamer.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
              >
                {getTimeText()}
              </Typography>
            </Box>
          </Box>

          {/* Stream Title */}
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            sx={{
              fontWeight: 600,
              fontSize: '1.1rem',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {stream.title}
          </Typography>

          {/* Description */}
          {stream.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 1
              }}
            >
              {stream.description}
            </Typography>
          )}

          {/* Tags */}
          {stream.tags && stream.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {stream.tags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  label={`#${tag}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              ))}
              {stream.tags.length > 3 && (
                <Chip
                  label={`+${stream.tags.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              )}
            </Box>
          )}

          {/* Stats */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ThumbUp sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {stream.likes?.length || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Comment sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {stream.comments?.length || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Visibility sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {stream.viewCount || 0}
              </Typography>
            </Box>
          </Box>
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ px: 2, pb: 2 }}>
          {isOwner ? (
            // Owner actions
            <Box sx={{ width: '100%' }}>
              {stream.status === 'scheduled' && (
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  startIcon={<Live />}
                  onClick={() => onStartBroadcast(stream)}
                  sx={{
                    background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
                    }
                  }}
                >
                  Start Streaming
                </Button>
              )}
              {stream.status === 'live' && (
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  startIcon={<Stop />}
                  onClick={() => onStartBroadcast(stream)}
                >
                  Manage Stream
                </Button>
              )}
              {stream.status === 'ended' && (
                <Button
                  fullWidth
                  variant="outlined"
                  disabled
                >
                  Stream Ended
                </Button>
              )}
            </Box>
          ) : (
            // Viewer actions
            <Box sx={{ width: '100%' }}>
              {stream.status === 'live' && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => onWatch(stream)}
                  sx={{
                    background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #26C6DA, #2E7D7A)',
                    }
                  }}
                >
                  Watch Live
                </Button>
              )}
              {stream.status === 'scheduled' && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Schedule />}
                  disabled
                >
                  {stream.scheduledStartTime 
                    ? `Starts ${formatDistanceToNow(new Date(stream.scheduledStartTime))}`
                    : 'Scheduled'
                  }
                </Button>
              )}
              {stream.status === 'ended' && (
                <Button
                  fullWidth
                  variant="outlined"
                  disabled
                >
                  Stream Ended
                </Button>
              )}
            </Box>
          )}
        </CardActions>
      </Card>
    </motion.div>
  );
};

export default StreamCard;
