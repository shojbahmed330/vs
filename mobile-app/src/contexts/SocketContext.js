import React, {createContext, useContext, useEffect, useState} from 'react';
import io from 'socket.io-client';
import {useAuth} from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({children}) => {
  const {user, token} = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (user && token) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user, token]);

  const initializeSocket = async () => {
    try {
      // Get server URL from config
      const serverURL = await getServerURL();
      
      const newSocket = io(serverURL, {
        auth: {
          token,
          userId: user._id,
        },
        transports: ['websocket'],
        timeout: 20000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        
        // Join user's personal room
        newSocket.emit('join_user_room', user._id);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Listen for online users updates
      newSocket.on('online_users_update', (users) => {
        setOnlineUsers(users);
      });

      // Listen for real-time notifications
      newSocket.on('new_notification', (notification) => {
        console.log('New notification received:', notification);
        // Handle real-time notification
      });

      // Listen for new messages
      newSocket.on('new_message', (message) => {
        console.log('New message received:', message);
        // Handle real-time message
      });

      // Listen for friend request updates
      newSocket.on('friend_request_update', (data) => {
        console.log('Friend request update:', data);
        // Handle friend request update
      });

      // Listen for live stream updates
      newSocket.on('live_stream_update', (data) => {
        console.log('Live stream update:', data);
        // Handle live stream notification
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
    }
  };

  const getServerURL = async () => {
    try {
      // Get from stored config or use default
      const storedURL = await AsyncStorage.getItem('serverURL');
      return storedURL || 'http://localhost:5000'; // Default server URL
    } catch (error) {
      return 'http://localhost:5000';
    }
  };

  const emitEvent = (eventName, data) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', eventName);
    }
  };

  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('join_room', roomId);
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leave_room', roomId);
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    emitEvent,
    joinRoom,
    leaveRoom,
    initializeSocket,
    disconnectSocket,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};