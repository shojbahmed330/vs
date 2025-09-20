import React, { createContext, useContext, useState, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useAuth } from './AuthContext';
import axios from 'axios';

const AgoraContext = createContext();

// Agora App ID - This should be from environment variables in production
const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID || 'your-agora-app-id';

export const AgoraProvider = ({ children }) => {
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
  const [remoteUsers, setRemoteUsers] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callMode, setCallMode] = useState(null); // 'audio' or 'video'
  const [currentChannel, setCurrentChannel] = useState(null);
  const [currentCallData, setCurrentCallData] = useState(null);

  // Initialize Agora client
  const initializeClient = useCallback(() => {
    if (!client) {
      const agoraClient = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8',
        role: 'host'
      });

      // Handle remote user events
      agoraClient.on('user-published', async (user, mediaType) => {
        console.log('User published:', user.uid, mediaType);
        await agoraClient.subscribe(user, mediaType);
        
        setRemoteUsers(prev => ({
          ...prev,
          [user.uid]: {
            ...prev[user.uid],
            [mediaType]: user[`${mediaType}Track`]
          }
        }));
      });

      agoraClient.on('user-unpublished', (user, mediaType) => {
        console.log('User unpublished:', user.uid, mediaType);
        setRemoteUsers(prev => {
          const updated = { ...prev };
          if (updated[user.uid]) {
            delete updated[user.uid][mediaType];
            if (!updated[user.uid].audio && !updated[user.uid].video) {
              delete updated[user.uid];
            }
          }
          return updated;
        });
      });

      agoraClient.on('user-left', (user) => {
        console.log('User left:', user.uid);
        setRemoteUsers(prev => {
          const updated = { ...prev };
          delete updated[user.uid];
          return updated;
        });
      });

      setClient(agoraClient);
      return agoraClient;
    }
    return client;
  }, [client]);

  // Get Agora token from backend
  const getAgoraToken = async (channelName, uid, role = 'publisher') => {
    try {
      const response = await axios.post('/api/calls/agora-token', {
        channelName,
        uid,
        role
      });
      return response.data.token;
    } catch (error) {
      console.error('Error getting Agora token:', error);
      throw error;
    }
  };

  // Start a call
  const startCall = async (targetUserId, isVideoCall = false) => {
    try {
      const agoraClient = initializeClient();
      const callMode = isVideoCall ? 'video' : 'audio';
      
      // Create call session in backend
      const response = await axios.post('/api/calls/start', {
        targetUserId,
        callType: callMode
      });

      const { callId, channelName } = response.data;
      const uid = user.id || user._id;
      
      // Get Agora token
      const token = await getAgoraToken(channelName, uid);

      // Create local tracks
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'music_standard'
      });
      
      let videoTrack = null;
      if (isVideoCall) {
        videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: '720p_2'
        });
      }

      setLocalTracks({ audio: audioTrack, video: videoTrack });

      // Join channel
      await agoraClient.join(AGORA_APP_ID, channelName, token, uid);
      
      // Publish tracks
      const tracksToPublish = [audioTrack];
      if (videoTrack) tracksToPublish.push(videoTrack);
      
      await agoraClient.publish(tracksToPublish);

      setIsJoined(true);
      setIsCallActive(true);
      setCallMode(callMode);
      setCurrentChannel(channelName);
      setCurrentCallData({ callId, targetUserId, channelName });

      return { callId, channelName };
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  };

  // Join an incoming call
  const joinCall = async (callData) => {
    try {
      const agoraClient = initializeClient();
      const { callId, channelName, callType } = callData;
      const uid = user.id || user._id;

      // Accept the call in backend
      await axios.post(`/api/calls/${callId}/accept`);

      // Get Agora token
      const token = await getAgoraToken(channelName, uid);

      // Create local tracks
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      let videoTrack = null;
      
      if (callType === 'video') {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
      }

      setLocalTracks({ audio: audioTrack, video: videoTrack });

      // Join channel
      await agoraClient.join(AGORA_APP_ID, channelName, token, uid);
      
      // Publish tracks
      const tracksToPublish = [audioTrack];
      if (videoTrack) tracksToPublish.push(videoTrack);
      
      await agoraClient.publish(tracksToPublish);

      setIsJoined(true);
      setIsCallActive(true);
      setCallMode(callType);
      setCurrentChannel(channelName);
      setCurrentCallData(callData);

      return true;
    } catch (error) {
      console.error('Error joining call:', error);
      throw error;
    }
  };

  // End call
  const endCall = async () => {
    try {
      if (currentCallData) {
        await axios.post(`/api/calls/${currentCallData.callId}/end`);
      }

      // Leave channel
      if (client && isJoined) {
        await client.leave();
      }

      // Close local tracks
      if (localTracks.audio) {
        localTracks.audio.close();
      }
      if (localTracks.video) {
        localTracks.video.close();
      }

      // Reset state
      setLocalTracks({ audio: null, video: null });
      setRemoteUsers({});
      setIsJoined(false);
      setIsCallActive(false);
      setCallMode(null);
      setCurrentChannel(null);
      setCurrentCallData(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // Reject incoming call
  const rejectCall = async (callId) => {
    try {
      await axios.post(`/api/calls/${callId}/reject`);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (localTracks.audio) {
      await localTracks.audio.setEnabled(!localTracks.audio.enabled);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (localTracks.video) {
      await localTracks.video.setEnabled(!localTracks.video.enabled);
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (localTracks.video) {
      await localTracks.video.switchDevice();
    }
  };

  // Mute/unmute remote user
  const muteRemoteUser = async (uid, mediaType) => {
    if (client && remoteUsers[uid] && remoteUsers[uid][mediaType]) {
      const track = remoteUsers[uid][mediaType];
      await track.setEnabled(!track.enabled);
    }
  };

  const value = {
    // State
    client,
    localTracks,
    remoteUsers,
    isJoined,
    isCallActive,
    callMode,
    currentChannel,
    currentCallData,

    // Actions
    initializeClient,
    startCall,
    joinCall,
    endCall,
    rejectCall,
    toggleMicrophone,
    toggleCamera,
    switchCamera,
    muteRemoteUser,
    getAgoraToken
  };

  return (
    <AgoraContext.Provider value={value}>
      {children}
    </AgoraContext.Provider>
  );
};

export const useAgora = () => {
  const context = useContext(AgoraContext);
  if (!context) {
    throw new Error('useAgora must be used within an AgoraProvider');
  }
  return context;
};

export default AgoraContext;
