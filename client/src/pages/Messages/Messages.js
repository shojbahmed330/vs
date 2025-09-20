import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  TextField,
  IconButton,
  Divider,
  Chip,
  Button
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  VideoCall as VideoCallIcon,
  Call as CallIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const Messages = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (userId) {
      loadChatWithUser(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', handleNewMessage);
      return () => socket.off('receive_message');
    }
  }, [socket]);

  const loadConversations = async () => {
    try {
      const response = await axios.get('/messages/conversations');
      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const loadChatWithUser = async (chatUserId) => {
    try {
      const userResponse = await axios.get(`/users/${chatUserId}`);
      const messagesResponse = await axios.get(`/messages/conversation/${chatUserId}`);
      
      setSelectedChat(userResponse.data);
      setMessages(messagesResponse.data);
      
      // Mark messages as read
      await axios.put(`/messages/mark-read/${chatUserId}`);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const handleNewMessage = (message) => {
    if (selectedChat && message.senderId === selectedChat._id) {
      setMessages(prev => [...prev, message]);
    }
    // Update conversations list
    loadConversations();
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;
    
    try {
      const messageData = {
        receiverId: selectedChat._id,
        messageType: 'text',
        content: { text: messageText }
      };
      
      const response = await axios.post('/messages/send', messageData);
      setMessages(prev => [...prev, response.data]);
      setMessageText('');
      
      // Send via socket for real-time delivery
      if (socket) {
        socket.emit('send_message', {
          receiverId: selectedChat._id,
          message: messageText,
          senderId: user._id
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3, height: 'calc(100vh - 100px)' }}>
      <Paper sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        {/* Conversations List */}
        <Box
          sx={{
            width: { xs: selectedChat ? 0 : '100%', md: 350 },
            borderRight: '1px solid',
            borderColor: 'divider',
            display: { xs: selectedChat ? 'none' : 'block', md: 'block' }
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Messages
            </Typography>
            <TextField
              fullWidth
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              size="small"
            />
          </Box>
          
          <List sx={{ p: 0, overflow: 'auto', height: 'calc(100% - 120px)' }}>
            {filteredConversations.map((conversation) => (
              <ListItem
                key={conversation.user._id}
                button
                selected={selectedChat?._id === conversation.user._id}
                onClick={() => loadChatWithUser(conversation.user._id)}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color={onlineUsers.has(conversation.user._id) ? 'success' : 'default'}
                  >
                    <Avatar src={conversation.user.avatar}>
                      {conversation.user.fullName.charAt(0)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        {conversation.user.fullName}
                      </Typography>
                      {conversation.lastMessage && (
                        <Typography variant="caption" color="text.secondary">
                          {moment(conversation.lastMessage.createdAt).format('HH:mm')}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 200
                        }}
                      >
                        {conversation.lastMessage?.content?.text || 'No messages yet'}
                      </Typography>
                      {conversation.unreadCount > 0 && (
                        <Chip
                          label={conversation.unreadCount}
                          size="small"
                          color="primary"
                          sx={{ minWidth: 20, height: 20 }}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
            
            {filteredConversations.length === 0 && (
              <Box p={3} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </Typography>
              </Box>
            )}
          </List>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color={onlineUsers.has(selectedChat._id) ? 'success' : 'default'}
                  >
                    <Avatar src={selectedChat.avatar}>
                      {selectedChat.fullName.charAt(0)}
                    </Avatar>
                  </Badge>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedChat.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {onlineUsers.has(selectedChat._id) ? 'Online' : `Last seen ${moment(selectedChat.lastSeen).fromNow()}`}
                    </Typography>
                  </Box>
                </Box>
                
                <Box>
                  <IconButton>
                    <CallIcon />
                  </IconButton>
                  <IconButton>
                    <VideoCallIcon />
                  </IconButton>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages Area */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender._id === user._id;
                  return (
                    <motion.div
                      key={message._id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                          mb: 1
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor: isOwnMessage ? 'primary.main' : 'background.default',
                            color: isOwnMessage ? 'primary.contrastText' : 'text.primary'
                          }}
                        >
                          <Typography variant="body2">
                            {message.content.text}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              opacity: 0.7,
                              display: 'block',
                              textAlign: 'right',
                              mt: 0.5
                            }}
                          >
                            {moment(message.createdAt).format('HH:mm')}
                          </Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  );
                })}
              </Box>

              {/* Message Input */}
              <Box
                sx={{
                  p: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'end'
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  multiline
                  maxRows={4}
                  variant="outlined"
                  size="small"
                />
                <IconButton
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  color="primary"
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Typography variant="h6" color="text.secondary">
                Select a conversation to start messaging
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose from your existing conversations or start a new one
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Messages;