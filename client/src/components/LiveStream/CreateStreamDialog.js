import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close,
  Public,
  People,
  Lock,
  Add,
  Delete
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const CreateStreamDialog = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    privacy: 'public',
    scheduledStartTime: null,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (error) setError('');
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      scheduledStartTime: date
    }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        privacy: formData.privacy,
        tags: formData.tags
      };

      if (formData.scheduledStartTime) {
        submitData.scheduledStartTime = formData.scheduledStartTime.toISOString();
      }

      await onSubmit(submitData);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to create stream');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        description: '',
        privacy: 'public',
        scheduledStartTime: null,
        tags: []
      });
      setTagInput('');
      setError('');
      onClose();
    }
  };

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'public':
        return <Public />;
      case 'friends':
        return <People />;
      case 'private':
        return <Lock />;
      default:
        return <Public />;
    }
  };

  const getPrivacyDescription = (privacy) => {
    switch (privacy) {
      case 'public':
        return 'Anyone can discover and watch your stream';
      case 'friends':
        return 'Only your friends can watch your stream';
      case 'private':
        return 'Only you can access this stream (for testing)';
      default:
        return '';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        color: 'white'
      }}>
        <Typography variant="h6" component="div">
          Create Live Stream
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          sx={{ color: 'white' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Title */}
        <TextField
          fullWidth
          label="Stream Title"
          value={formData.title}
          onChange={handleChange('title')}
          placeholder="What's your stream about?"
          margin="normal"
          required
          inputProps={{ maxLength: 100 }}
          helperText={`${formData.title.length}/100 characters`}
        />

        {/* Description */}
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={handleChange('description')}
          placeholder="Tell viewers what to expect..."
          margin="normal"
          multiline
          rows={3}
          inputProps={{ maxLength: 500 }}
          helperText={`${formData.description.length}/500 characters`}
        />

        {/* Privacy */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Privacy</InputLabel>
          <Select
            value={formData.privacy}
            onChange={handleChange('privacy')}
            label="Privacy"
            startAdornment={getPrivacyIcon(formData.privacy)}
          >
            <MenuItem value="public">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Public sx={{ mr: 1 }} />
                Public
              </Box>
            </MenuItem>
            <MenuItem value="friends">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <People sx={{ mr: 1 }} />
                Friends Only
              </Box>
            </MenuItem>
            <MenuItem value="private">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Lock sx={{ mr: 1 }} />
                Private
              </Box>
            </MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {getPrivacyDescription(formData.privacy)}
          </Typography>
        </FormControl>

        {/* Scheduled Start Time */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateTimePicker
            label="Schedule Stream (Optional)"
            value={formData.scheduledStartTime}
            onChange={handleDateChange}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                margin="normal"
                helperText="Leave empty to start streaming immediately"
              />
            )}
            minDateTime={new Date()}
          />
        </LocalizationProvider>

        {/* Tags */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tags (Optional)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder="Add a tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={formData.tags.length >= 5}
              inputProps={{ maxLength: 20 }}
            />
            <Button
              variant="outlined"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || formData.tags.length >= 5}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              <Add />
            </Button>
          </Box>
          
          {formData.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {formData.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={`#${tag}`}
                  onDelete={() => handleRemoveTag(tag)}
                  deleteIcon={<Delete />}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
          
          <Typography variant="caption" color="text.secondary">
            Add up to 5 tags to help people discover your stream
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ bgcolor: 'background.paper', p: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ color: 'text.secondary' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #5a6fd8 0%, #6a4190 100%)',
            }
          }}
        >
          {loading ? 'Creating...' : 'Create Stream'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateStreamDialog;
