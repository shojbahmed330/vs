import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  People as PeopleIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const Groups = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    privacy: 'public',
    category: 'general'
  });

  useEffect(() => {
    loadMyGroups();
    searchGroups('');
  }, []);

  useEffect(() => {
    if (groupId) {
      loadGroupDetails(groupId);
    }
  }, [groupId]);

  const loadMyGroups = async () => {
    try {
      const response = await axios.get('/groups/my-groups');
      setMyGroups(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading groups:', error);
      setLoading(false);
    }
  };

  const searchGroups = async (query) => {
    try {
      const response = await axios.get(`/groups/search/${query || 'all'}`);
      setGroups(response.data);
    } catch (error) {
      console.error('Error searching groups:', error);
    }
  };

  const loadGroupDetails = async (id) => {
    try {
      const response = await axios.get(`/groups/${id}`);
      setSelectedGroup(response.data);
    } catch (error) {
      console.error('Error loading group details:', error);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await axios.post('/groups/create', newGroup);
      setMyGroups(prev => [response.data, ...prev]);
      setCreateDialogOpen(false);
      setNewGroup({ name: '', description: '', privacy: 'public', category: 'general' });
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await axios.post(`/groups/${groupId}/join`);
      loadMyGroups();
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'public': return <PublicIcon />;
      case 'closed': return <PeopleIcon />;
      case 'secret': return <PrivateIcon />;
      default: return <PublicIcon />;
    }
  };

  const GroupCard = ({ group, isJoined = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar src={group.avatar} sx={{ width: 50, height: 50 }}>
              <GroupIcon />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" fontWeight="bold" noWrap>
                {group.name}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {getPrivacyIcon(group.privacy)}
                <Typography variant="caption" color="text.secondary">
                  {group.privacy} • {group.members?.length || 0} members
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {group.description || 'No description available'}
          </Typography>
          
          <Chip
            label={group.category}
            size="small"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        </CardContent>
        
        <CardActions>
          {isJoined ? (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => loadGroupDetails(group._id)}
            >
              View Group
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              onClick={() => handleJoinGroup(group._id)}
            >
              Join Group
            </Button>
          )}
        </CardActions>
      </Card>
    </motion.div>
  );

  if (selectedGroup) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar src={selectedGroup.avatar} sx={{ width: 80, height: 80 }}>
              <GroupIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {selectedGroup.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {selectedGroup.members?.length || 0} members • {selectedGroup.privacy} group
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body1" paragraph>
            {selectedGroup.description}
          </Typography>
          
          <Box display="flex" gap={1} mb={3}>
            <Button variant="contained">Join Group</Button>
            <Button variant="outlined">Share</Button>
          </Box>
          
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Group activity and posts will appear here...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Group
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, value) => setTabValue(value)}>
          <Tab label={`My Groups (${myGroups.length})`} />
          <Tab label="Discover" />
          <Tab label="Suggested" />
        </Tabs>
      </Paper>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search groups..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          searchGroups(e.target.value);
        }}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
        }}
        sx={{ mb: 3 }}
      />

      {tabValue === 0 && (
        <Box>
          {myGroups.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 3
              }}
            >
              {myGroups.map((group) => (
                <GroupCard key={group._id} group={group} isJoined={true} />
              ))}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <GroupIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                You haven't joined any groups yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Discover and join groups that match your interests
              </Typography>
              <Button
                variant="contained"
                onClick={() => setTabValue(1)}
              >
                Discover Groups
              </Button>
            </Paper>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 3
          }}
        >
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </Box>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Suggested groups coming soon...
          </Typography>
        </Paper>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Group Name"
            value={newGroup.name}
            onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={newGroup.description}
            onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
            sx={{ mb: 2 }}
          />
          {/* Add more fields for privacy, category etc. */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained">Create Group</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Groups;