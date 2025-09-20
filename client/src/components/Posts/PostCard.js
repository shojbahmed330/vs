import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Box,
  Button,
  Menu,
  MenuItem,
  TextField,
  Collapse,
  Divider,
  Chip,
  Dialog,
  DialogContent
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Send as SendIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  TagFaces as LaughIcon,
  SentimentVeryDissatisfied as SadIcon,
  SentimentDissatisfied as AngryIcon,
  SentimentVerySatisfied as WowIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const PostCard = ({ post }) => {
  const { user } = useAuth();
  const { socket, postReaction } = useSocket();
  const [anchorEl, setAnchorEl] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [reactions, setReactions] = useState(post.reactions || {});
  const [mediaDialog, setMediaDialog] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const reactionTypes = [
    { type: 'like', icon: ThumbUpIcon, color: '#1976d2', label: 'Like' },
    { type: 'love', icon: FavoriteIcon, color: '#f44336', label: 'Love' },
    { type: 'laugh', icon: LaughIcon, color: '#ff9800', label: 'Laugh' },
    { type: 'wow', icon: WowIcon, color: '#9c27b0', label: 'Wow' },
    { type: 'sad', icon: SadIcon, color: '#607d8b', label: 'Sad' },
    { type: 'angry', icon: AngryIcon, color: '#795548', label: 'Angry' }
  ];

  const getUserReaction = () => {
    for (const [reactionType, users] of Object.entries(reactions)) {
      if (users.includes(user?._id)) {
        return reactionType;
      }
    }
    return null;
  };

  const getTotalReactions = () => {
    return Object.values(reactions).reduce((total, users) => total + users.length, 0);
  };

  const getTopReactions = () => {
    return Object.entries(reactions)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 3)
      .filter(([, users]) => users.length > 0);
  };

  const handleReaction = async (reactionType) => {
    try {
      const response = await axios.post(`/posts/${post._id}/react`, {
        reactionType
      });
      
      setReactions(response.data.reactions);
      
      // Emit real-time update
      if (socket) {
        postReaction({
          postId: post._id,
          reactions: response.data.reactions
        });
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      const response = await axios.post(`/posts/${post._id}/comment`, {
        text: commentText
      });
      
      setComments(prev => [...prev, response.data]);
      setCommentText('');
    } catch (error) {
      console.error('Error commenting on post:', error);
    }
  };

  const handleShare = async () => {
    try {
      await axios.post(`/posts/${post._id}/share`);
      // Show success message or update UI
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const ReactionButton = ({ reaction }) => {
    const IconComponent = reaction.icon;
    const isActive = getUserReaction() === reaction.type;
    
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <IconButton
          size="small"
          onClick={() => handleReaction(reaction.type)}
          sx={{
            color: isActive ? reaction.color : 'text.secondary',
            '&:hover': {
              backgroundColor: `${reaction.color}20`,
              color: reaction.color
            }
          }}
        >
          <IconComponent fontSize="small" />
        </IconButton>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        sx={{ mb: 3 }} 
        data-post-id={post._id}
        data-author={post.author?.username}
      >
        {/* Post Header */}
        <CardHeader
          avatar={
            <Avatar src={post.author?.avatar}>
              {post.author?.fullName?.charAt(0)}
            </Avatar>
          }
          action={
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          }
          title={
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {post.author?.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                @{post.author?.username}
              </Typography>
            </Box>
          }
          subheader={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="text.secondary">
                {moment(post.createdAt).fromNow()}
              </Typography>
              {post.visibility !== 'public' && (
                <Chip label={post.visibility} size="small" variant="outlined" />
              )}
            </Box>
          }
        />

        {/* Post Content */}
        <CardContent sx={{ pt: 0 }}>
          {post.content?.text && (
            <Typography variant="body1" paragraph>
              {post.content.text}
            </Typography>
          )}
          
          {/* Media Content */}
          {post.content?.media && post.content.media.length > 0 && (
            <Box mt={2}>
              {post.content.media.map((media, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedMedia(media);
                    setMediaDialog(true);
                  }}
                >
                  {media.type === 'image' && (
                    <img
                      src={media.url}
                      alt="Post media"
                      style={{
                        width: '100%',
                        maxHeight: 400,
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  {media.type === 'video' && (
                    <video
                      src={media.url}
                      poster={media.thumbnail}
                      controls
                      style={{
                        width: '100%',
                        maxHeight: 400
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
          
          {/* Tags and Hashtags */}
          {(post.tags?.length > 0 || post.hashtags?.length > 0) && (
            <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
              {post.tags?.map((tag, index) => (
                <Chip
                  key={`tag-${index}`}
                  label={`@${tag.username}`}
                  size="small"
                  clickable
                  color="primary"
                  variant="outlined"
                />
              ))}
              {post.hashtags?.map((hashtag, index) => (
                <Chip
                  key={`hashtag-${index}`}
                  label={`#${hashtag}`}
                  size="small"
                  clickable
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </CardContent>

        {/* Reactions Summary */}
        {getTotalReactions() > 0 && (
          <Box px={2} pb={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={0.5}>
                {getTopReactions().map(([reactionType]) => {
                  const reaction = reactionTypes.find(r => r.type === reactionType);
                  const IconComponent = reaction?.icon;
                  return IconComponent ? (
                    <IconComponent
                      key={reactionType}
                      sx={{ fontSize: 16, color: reaction.color }}
                    />
                  ) : null;
                })}
                <Typography variant="caption" color="text.secondary" ml={0.5}>
                  {getTotalReactions()}
                </Typography>
              </Box>
              
              {comments.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        <Divider />

        {/* Action Buttons */}
        <CardActions sx={{ justifyContent: 'space-around', py: 1 }}>
          <Button
            startIcon={
              getUserReaction() ? (
                <ThumbUpIcon sx={{ color: 'primary.main' }} />
              ) : (
                <ThumbUpOutlinedIcon />
              )
            }
            onClick={() => handleReaction('like')}
            data-action="like"
            sx={{
              color: getUserReaction() ? 'primary.main' : 'text.secondary',
              '&:hover': { backgroundColor: 'primary.light', color: 'primary.main' }
            }}
          >
            Like
          </Button>
          
          <Button
            startIcon={<CommentIcon />}
            onClick={() => setShowComments(!showComments)}
            data-action="comment"
            sx={{
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'info.light', color: 'info.main' }
            }}
          >
            Comment
          </Button>
          
          <Button
            startIcon={<ShareIcon />}
            onClick={handleShare}
            data-action="share"
            sx={{
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'success.light', color: 'success.main' }
            }}
          >
            Share
          </Button>
        </CardActions>

        {/* Quick Reactions */}
        <Box px={2} pb={1}>
          <Box display="flex" justifyContent="center" gap={1}>
            {reactionTypes.map((reaction) => (
              <ReactionButton key={reaction.type} reaction={reaction} />
            ))}
          </Box>
        </Box>

        {/* Comments Section */}
        <Collapse in={showComments}>
          <Divider />
          <Box p={2}>
            {/* Comment Input */}
            <Box display="flex" gap={2} mb={2}>
              <Avatar src={user?.avatar} sx={{ width: 32, height: 32 }}>
                {user?.fullName?.charAt(0)}
              </Avatar>
              <TextField
                fullWidth
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                size="small"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={handleComment}
                      disabled={!commentText.trim()}
                      size="small"
                    >
                      <SendIcon />
                    </IconButton>
                  )
                }}
              />
            </Box>
            
            {/* Comments List */}
            <AnimatePresence>
              {comments.map((comment, index) => (
                <motion.div
                  key={comment._id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Box display="flex" gap={2} mb={2}>
                    <Avatar src={comment.author?.avatar} sx={{ width: 32, height: 32 }}>
                      {comment.author?.fullName?.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Box
                        sx={{
                          backgroundColor: 'background.default',
                          borderRadius: 2,
                          p: 1.5
                        }}
                      >
                        <Typography variant="caption" fontWeight="bold" display="block">
                          {comment.author?.fullName}
                        </Typography>
                        <Typography variant="body2">
                          {comment.text}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" ml={1}>
                        {moment(comment.timestamp).fromNow()}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          </Box>
        </Collapse>

        {/* Post Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => setAnchorEl(null)}>Save Post</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Hide Post</MenuItem>
          {post.author?._id === user?._id && (
            <MenuItem onClick={() => setAnchorEl(null)}>Delete Post</MenuItem>
          )}
          <MenuItem onClick={() => setAnchorEl(null)}>Report Post</MenuItem>
        </Menu>

        {/* Media Dialog */}
        <Dialog
          open={mediaDialog}
          onClose={() => setMediaDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogContent sx={{ p: 0 }}>
            {selectedMedia && (
              <Box>
                {selectedMedia.type === 'image' && (
                  <img
                    src={selectedMedia.url}
                    alt="Full size media"
                    style={{ width: '100%', height: 'auto' }}
                  />
                )}
                {selectedMedia.type === 'video' && (
                  <video
                    src={selectedMedia.url}
                    controls
                    autoPlay
                    style={{ width: '100%', height: 'auto' }}
                  />
                )}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </motion.div>
  );
};

export default PostCard;