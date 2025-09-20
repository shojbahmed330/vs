import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Avatar,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Paper,
  Grid
} from '@mui/material';
import {
  Public as PublicIcon,
  People as FriendsIcon,
  Lock as PrivateIcon,
  Photo as PhotoIcon,
  VideoCall as VideoIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import { useVoice } from '../../contexts/VoiceContext';

const CreatePostDialog = ({ open, onClose, onPostCreated }) => {
  const { user } = useAuth();
  const { showVoiceFeedback } = useVoice();
  const [postText, setPostText] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [tags, setTags] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [location, setLocation] = useState('');

  const handleSubmit = async () => {
    if (!postText.trim() && media.length === 0) {
      showVoiceFeedback('Please add some content to your post', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const postData = {
        content: {
          text: postText,
          media: media
        },
        visibility,
        tags,
        hashtags,
        location: location ? { name: location } : undefined
      };

      const response = await axios.post('/posts', postData);
      
      if (onPostCreated) {
        onPostCreated(response.data);
      }
      
      // Reset form
      setPostText('');
      setVisibility('public');
      setMedia([]);
      setTags([]);
      setHashtags([]);
      setLocation('');
      
      showVoiceFeedback('Post created successfully!', 'success');
      
    } catch (error) {
      console.error('Error creating post:', error);
      showVoiceFeedback('Failed to create post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagExtraction = (text) => {
    const hashtagRegex = /#([a-zA-Z0-9_\u0980-\u09FF]+)/g;
    const extractedHashtags = [];
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      if (!extractedHashtags.includes(match[1])) {
        extractedHashtags.push(match[1]);
      }
    }
    
    setHashtags(extractedHashtags);
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setPostText(text);
    handleHashtagExtraction(text);
  };

  const visibilityOptions = [
    {
      value: 'public',
      label: 'Public',
      icon: <PublicIcon />,
      description: 'Anyone can see this post'
    },
    {
      value: 'friends',
      label: 'Friends',
      icon: <FriendsIcon />,
      description: 'Only your friends can see this'
    },
    {
      value: 'private',
      label: 'Only Me',
      icon: <PrivateIcon />,
      description: 'Only you can see this post'
    }
  ];

  const selectedVisibility = visibilityOptions.find(option => option.value === visibility);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Create Post
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* User Info */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar src={user?.avatar}>
              {user?.fullName?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {user?.fullName}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  startAdornment={selectedVisibility?.icon}
                >
                  {visibilityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {option.icon}
                        <Box>
                          <Typography variant="body2">{option.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Post Content */}
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="What's on your mind?"
            value={postText}
            onChange={handleTextChange}
            variant="outlined"
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />

          {/* Hashtags Display */}
          {hashtags.length > 0 && (
            <Box mb={2}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Hashtags:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {hashtags.map((hashtag, index) => (
                  <Chip
                    key={index}
                    label={`#${hashtag}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Location */}
          <TextField
            fullWidth
            placeholder="Add location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            InputProps={{
              startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 3 }}
          />

          {/* Media Upload Area */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              backgroundColor: 'background.default',
              borderStyle: 'dashed',
              borderRadius: 2,
              mb: 3
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Add photos or videos to your post
            </Typography>
            <Box display="flex" justifyContent="center" gap={2} mt={2}>
              <Button
                variant="outlined"
                startIcon={<PhotoIcon />}
                sx={{ borderRadius: 2 }}
              >
                Photo
              </Button>
              <Button
                variant="outlined"
                startIcon={<VideoIcon />}
                sx={{ borderRadius: 2 }}
              >
                Video
              </Button>
            </Box>
          </Paper>

          {/* Voice Command Info */}
          <Paper
            sx={{
              p: 2,
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              borderRadius: 2
            }}
          >
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              🎤 Voice Tip:
            </Typography>
            <Typography variant="caption">
              You can create posts using voice commands! Try saying "post koro" or "create post"
            </Typography>
          </Paper>
        </motion.div>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || (!postText.trim() && media.length === 0)}
            startIcon={loading ? undefined : <SendIcon />}
            sx={{ minWidth: 100 }}
          >
            {loading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <div className="loading-spinner" />
                Posting...
              </Box>
            ) : (
              'Post'
            )}
          </Button>
        </motion.div>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePostDialog;