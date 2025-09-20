import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Photo as PhotoIcon,
  VideoCall as VideoIcon,
  Group as GroupIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import InfiniteScroll from 'react-infinite-scroll-component';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import PostCard from '../../components/Posts/PostCard';
import CreatePostDialog from '../../components/Posts/CreatePostDialog';
import Stories from '../../components/Posts/Stories';

const Home = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [quickPostText, setQuickPostText] = useState('');
  const [trends, setTrends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Load initial posts
  useEffect(() => {
    loadPosts();
    loadTrends();
    loadSuggestions();
  }, []);

  // Real-time post updates
  useEffect(() => {
    if (socket) {
      socket.on('post_updated', (data) => {
        setPosts(prev => prev.map(post => 
          post._id === data.postId ? { ...post, reactions: data.reactions } : post
        ));
      });

      return () => {
        socket.off('post_updated');
      };
    }
  }, [socket]);

  const loadPosts = async () => {
    try {
      const response = await axios.get(`/posts/feed?page=${page}&limit=10`);
      const newPosts = response.data;
      
      if (page === 1) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMore(newPosts.length === 10);
      setLoading(false);
    } catch (error) {
      console.error('Error loading posts:', error);
      setLoading(false);
    }
  };

  const loadMorePosts = () => {
    setPage(prev => prev + 1);
    loadPosts();
  };

  const loadTrends = async () => {
    try {
      // Mock trending topics - in real app, this would come from backend analytics
      setTrends([
        { tag: 'VoiceSocial', count: '1.2K posts' },
        { tag: 'AI', count: '856 posts' },
        { tag: 'Technology', count: '743 posts' },
        { tag: 'Bangladesh', count: '623 posts' },
        { tag: 'SocialMedia', count: '512 posts' }
      ]);
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await axios.get('/users/suggestions/friends');
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleQuickPost = async () => {
    if (!quickPostText.trim()) return;
    
    try {
      const response = await axios.post('/posts', {
        content: { text: quickPostText },
        postType: 'text',
        visibility: 'public'
      });
      
      setPosts(prev => [response.data, ...prev]);
      setQuickPostText('');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      await axios.post(`/users/follow/${userId}`);
      setSuggestions(prev => prev.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const SidebarCard = ({ title, children, action }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            {action}
          </Box>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Grid container spacing={3}>
        {/* Left Sidebar */}
        <Grid item xs={12} md={3}>
          {/* User Profile Card */}
          <SidebarCard title="Your Profile">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar src={user?.avatar} sx={{ width: 56, height: 56 }}>
                {user?.fullName?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {user?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @{user?.username}
                </Typography>
              </Box>
            </Box>
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                {user?.followers?.length || 0} followers • {user?.following?.length || 0} following
              </Typography>
            </Box>
          </SidebarCard>

          {/* Quick Actions */}
          <SidebarCard title="Quick Actions">
            <List dense>
              <ListItem button onClick={() => setCreatePostOpen(true)}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <AddIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary="Create Post" secondary="Share your thoughts" />
              </ListItem>
              
              <ListItem button>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <PhotoIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary="Upload Photo" secondary="Share a moment" />
              </ListItem>
              
              <ListItem button>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <VideoIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary="Go Live" secondary="Stream to friends" />
              </ListItem>
            </List>
          </SidebarCard>

          {/* Trending Topics */}
          <SidebarCard 
            title="Trending"
            action={
              <IconButton size="small">
                <TrendingIcon />
              </IconButton>
            }
          >
            <Box>
              {trends.map((trend, index) => (
                <Box key={index} mb={1}>
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    #{trend.tag}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {trend.count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </SidebarCard>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={6}>
          {/* Stories */}
          <Stories />

          {/* Quick Post */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card sx={{ mb: 3 }} data-action="create-post">
              <CardContent>
                <Box display="flex" gap={2} alignItems="center">
                  <Avatar src={user?.avatar}>
                    {user?.fullName?.charAt(0)}
                  </Avatar>
                  <TextField
                    fullWidth
                    placeholder="What's on your mind?"
                    variant="outlined"
                    value={quickPostText}
                    onChange={(e) => setQuickPostText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQuickPost();
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'background.default'
                      }
                    }}
                  />
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box display="flex" justifyContent="space-between">
                  <Button
                    startIcon={<PhotoIcon />}
                    sx={{ color: 'success.main' }}
                  >
                    Photo/Video
                  </Button>
                  <Button
                    startIcon={<VideoIcon />}
                    sx={{ color: 'error.main' }}
                  >
                    Live Video
                  </Button>
                  <Button
                    startIcon={<GroupIcon />}
                    sx={{ color: 'warning.main' }}
                  >
                    Tag Friends
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Posts Feed */}
          <InfiniteScroll
            dataLength={posts.length}
            next={loadMorePosts}
            hasMore={hasMore}
            loader={
              <Box textAlign="center" py={2}>
                <div className="loading-spinner" />
              </Box>
            }
            endMessage={
              <Box textAlign="center" py={3}>
                <Typography variant="body2" color="text.secondary">
                  You've seen all posts!
                </Typography>
              </Box>
            }
          >
            <AnimatePresence>
              {posts.map((post, index) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>
          </InfiniteScroll>
        </Grid>

        {/* Right Sidebar */}
        <Grid item xs={12} md={3}>
          {/* Friend Suggestions */}
          <SidebarCard title="People You May Know">
            <List dense>
              {suggestions.slice(0, 5).map((user) => (
                <ListItem key={user._id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar src={user.avatar}>
                      {user.fullName?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.fullName}
                    secondary={`@${user.username}`}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleFollowUser(user._id)}
                  >
                    Follow
                  </Button>
                </ListItem>
              ))}
            </List>
          </SidebarCard>

          {/* Online Friends */}
          <SidebarCard title="Online Friends">
            <List dense>
              {user?.friends?.filter(friend => friend.isOnline).slice(0, 8).map((friend) => (
                <ListItem key={friend._id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Box position="relative">
                      <Avatar src={friend.avatar} sx={{ width: 32, height: 32 }}>
                        {friend.fullName?.charAt(0)}
                      </Avatar>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 10,
                          height: 10,
                          bgcolor: 'success.main',
                          borderRadius: '50%',
                          border: '2px solid white'
                        }}
                      />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={friend.fullName}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              )) || []}
            </List>
          </SidebarCard>

          {/* Voice Commands Help */}
          <SidebarCard title="Voice Commands">
            <Box>
              <Typography variant="body2" gutterBottom>
                Try saying:
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Chip
                  label="লাইক করো / Like this"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label="পোস্ট করো / Create post"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label="স্ক্রল করো / Scroll down"
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" mt={1}>
                Press Ctrl+Space to activate voice control
              </Typography>
            </Box>
          </SidebarCard>
        </Grid>
      </Grid>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      >
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 80,
            left: 20,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={() => setCreatePostOpen(true)}
        >
          <AddIcon />
        </Fab>
      </motion.div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={(newPost) => {
          setPosts(prev => [newPost, ...prev]);
          setCreatePostOpen(false);
        }}
      />
    </Container>
  );
};

export default Home;