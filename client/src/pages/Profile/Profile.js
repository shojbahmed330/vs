import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  Card,
  CardContent,
  Tab,
  Tabs,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Link as LinkIcon,
  Cake as CakeIcon,
  PersonAdd as PersonAddIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import PostCard from '../../components/Posts/PostCard';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({});
  
  const isOwnProfile = !userId || userId === currentUser?._id;
  const userToShow = isOwnProfile ? currentUser : profileUser;

  useEffect(() => {
    if (isOwnProfile) {
      setProfileUser(currentUser);
      loadUserPosts(currentUser?._id);
    } else {
      loadUserProfile(userId);
      loadUserPosts(userId);
    }
  }, [userId, currentUser, isOwnProfile]);

  const loadUserProfile = async (id) => {
    try {
      const response = await axios.get(`/users/${id}`);
      setProfileUser(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserPosts = async (id) => {
    try {
      const response = await axios.get(`/posts/user/${id}`);
      setPosts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading posts:', error);
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditData({
      fullName: userToShow?.fullName || '',
      bio: userToShow?.bio || '',
      location: userToShow?.location || '',
      website: userToShow?.website || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      const response = await axios.put('/users/profile', editData);
      setProfileUser(response.data);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleFollow = async () => {
    try {
      await axios.post(`/users/follow/${userId}`);
      // Update UI to show following state
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (loading || !userToShow) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <div className="loading-spinner" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Profile Header */}
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          {/* Cover Photo */}
          <Box
            sx={{
              height: 200,
              background: userToShow.coverPhoto 
                ? `url(${userToShow.coverPhoto})` 
                : 'linear-gradient(135deg, #4267B2 0%, #42b883 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }}
          >
            {isOwnProfile && (
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  backgroundColor: 'rgba(255,255,255,0.9)'
                }}
              >
                <EditIcon />
              </IconButton>
            )}
          </Box>

          <Box sx={{ p: 3, pt: 0 }}>
            <Box display="flex" alignItems="end" gap={3} sx={{ mt: -6 }}>
              <Avatar
                src={userToShow.avatar}
                sx={{
                  width: 120,
                  height: 120,
                  border: '4px solid white',
                  fontSize: '2rem'
                }}
              >
                {userToShow.fullName?.charAt(0)}
              </Avatar>
              
              <Box flex={1}>
                <Box display="flex" justifyContent="space-between" alignItems="start" mt={2}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {userToShow.fullName}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      @{userToShow.username}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" gap={1}>
                    {isOwnProfile ? (
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleEditProfile}
                      >
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<PersonAddIcon />}
                          onClick={handleFollow}
                        >
                          Follow
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<MessageIcon />}
                        >
                          Message
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Profile Info */}
            <Box mt={3}>
              {userToShow.bio && (
                <Typography variant="body1" paragraph>
                  {userToShow.bio}
                </Typography>
              )}
              
              <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
                {userToShow.location && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {userToShow.location}
                    </Typography>
                  </Box>
                )}
                
                {userToShow.website && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <LinkIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="primary">
                      {userToShow.website}
                    </Typography>
                  </Box>
                )}
                
                {userToShow.dateOfBirth && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CakeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Born {new Date(userToShow.dateOfBirth).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Stats */}
              <Box display="flex" gap={3} mt={2}>
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold">
                    {posts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Posts
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold">
                    {userToShow.followers?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Followers
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold">
                    {userToShow.following?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Following
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Profile Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, value) => setTabValue(value)}>
            <Tab label="Posts" />
            <Tab label="About" />
            <Tab label="Photos" />
            <Tab label="Friends" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {tabValue === 0 && (
          <Box>
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No posts yet
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              About {userToShow.fullName}
            </Typography>
            <Typography variant="body1">
              {userToShow.bio || 'No bio available'}
            </Typography>
          </Paper>
        )}

        {tabValue === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Photos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Photo gallery coming soon...
            </Typography>
          </Paper>
        )}

        {tabValue === 3 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Friends ({userToShow.friends?.length || 0})
            </Typography>
            <Grid container spacing={2}>
              {userToShow.friends?.map((friend) => (
                <Grid item xs={6} sm={4} md={3} key={friend._id}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Avatar src={friend.avatar} sx={{ mx: 'auto', mb: 1 }}>
                        {friend.fullName?.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold">
                        {friend.fullName}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )) || (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary">
                    No friends to show
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </motion.div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Full Name"
            value={editData.fullName || ''}
            onChange={(e) => setEditData({...editData, fullName: e.target.value})}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Bio"
            multiline
            rows={3}
            value={editData.bio || ''}
            onChange={(e) => setEditData({...editData, bio: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Location"
            value={editData.location || ''}
            onChange={(e) => setEditData({...editData, location: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Website"
            value={editData.website || ''}
            onChange={(e) => setEditData({...editData, website: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;