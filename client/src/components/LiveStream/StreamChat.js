import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Paper,
  Badge,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Send,
  EmojiEmotions,
  ThumbUp,
  Favorite,
  LocalFireDepartment
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../contexts/SocketContext';
import * as livestreamAPI from '../../api/livestream';

const StreamChat = ({ streamId }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [reactions, setReactions] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const quickReactions = [
    { emoji: '👍', icon: ThumbUp, color: '#1976d2' },
    { emoji: '❤️', icon: Favorite, color: '#e91e63' },
    { emoji: '🔥', icon: LocalFireDepartment, color: '#ff5722' },
  ];

  useEffect(() => {
    if (socket && streamId) {
      // Listen for chat messages
      socket.on('stream_chat_message', handleNewMessage);
      socket.on('stream_reaction', handleNewReaction);
      
      return () => {
        socket.off('stream_chat_message');
        socket.off('stream_reaction');
      };
    }
  }, [socket, streamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, reactions]);

  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleNewReaction = (reaction) => {
    setReactions(prev => [
      ...prev,
      { ...reaction, id: Date.now() + Math.random() }
    ]);
    
    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const message = newMessage.trim();
      setNewMessage('');
      
      // Add comment via API
      await livestreamAPI.addStreamComment(streamId, message);
      
      // Also emit via socket for real-time
      if (socket) {
        socket.emit('stream_chat_message', {
          streamId,
          message
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (reaction) => {
    if (socket) {
      socket.emit('stream_reaction', {
        streamId,
        reaction: reaction.emoji
      });
    }
  };

  const formatMessageTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'now';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          💬 Live Chat
          <Badge
            badgeContent={messages.length}
            color="primary"
            sx={{ ml: 1 }}
          />
        </Typography>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 1,
          position: 'relative',
          minHeight: 0
        }}
      >
        {/* Messages */}
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  mb: 1.5,
                  alignItems: 'flex-start'
                }}
              >
                <Avatar
                  src={message.userAvatar}
                  sx={{ width: 32, height: 32, mr: 1 }}
                >
                  {message.userName?.charAt(0)}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 0.5
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: 'primary.main',
                        mr: 1
                      }}
                    >
                      {message.userName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {formatMessageTime(message.timestamp)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-word',
                      lineHeight: 1.4
                    }}
                  >
                    {message.message}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating Reactions */}
        <AnimatePresence>
          {reactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                scale: [0, 1.2, 1, 0.8],
                y: -100
              }}
              transition={{ duration: 3, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                right: Math.random() * 100 + 20,
                bottom: 60,
                fontSize: '24px',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              {reaction.reaction}
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </Box>

      {/* Quick Reactions */}
      <Box
        sx={{
          p: 1,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          gap: 1
        }}
      >
        {quickReactions.map((reaction, index) => (
          <Tooltip key={index} title={`Send ${reaction.emoji}`}>
            <IconButton
              size="small"
              onClick={() => handleReaction(reaction)}
              sx={{
                color: reaction.color,
                '&:hover': {
                  bgcolor: `${reaction.color}15`,
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s'
              }}
            >
              <reaction.icon fontSize="small" />
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      {/* Message Input */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            variant="outlined"
            size="small"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark'
              },
              '&:disabled': {
                bgcolor: 'action.disabled'
              }
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default StreamChat;
