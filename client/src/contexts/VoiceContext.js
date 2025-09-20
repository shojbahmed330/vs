import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { voiceCommands } from '../utils/voiceCommands';

const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [language, setLanguage] = useState('bn-BD'); // Bengali by default
  const [lastCommand, setLastCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, processing, error
  
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Update voice status based on user preferences
  useEffect(() => {
    if (user?.voiceSettings) {
      setVoiceEnabled(user.voiceSettings.enableVoiceControl);
      setLanguage(user.voiceSettings.voiceLanguage || 'bn-BD');
    }
  }, [user]);

  // Update listening state
  useEffect(() => {
    setIsListening(listening);
    if (listening) {
      setVoiceStatus('listening');
    } else if (!isProcessing) {
      setVoiceStatus('idle');
    }
  }, [listening, isProcessing]);

  // Process voice commands
  useEffect(() => {
    if (transcript && !listening && voiceEnabled) {
      processVoiceCommand(transcript);
    }
  }, [transcript, listening, voiceEnabled]);

  const processVoiceCommand = useCallback(async (command) => {
    if (!command.trim()) return;

    setIsProcessing(true);
    setVoiceStatus('processing');
    setLastCommand(command);
    
    // Add to command history
    setCommandHistory(prev => [{
      command,
      timestamp: new Date(),
      language
    }, ...prev.slice(0, 9)]); // Keep last 10 commands

    try {
      const result = await voiceCommands.processCommand(command, language, {
        user,
        socket,
        navigate: window.location
      });

      if (result.success) {
        setVoiceStatus('success');
        // Show success feedback
        showVoiceFeedback(result.message || 'কমান্ড সফল হয়েছে', 'success');
      } else {
        setVoiceStatus('error');
        showVoiceFeedback(result.error || 'কমান্ড বুঝতে পারিনি', 'error');
      }
    } catch (error) {
      console.error('Voice command processing error:', error);
      setVoiceStatus('error');
      showVoiceFeedback('কমান্ড প্রসেস করতে সমস্যা হয়েছে', 'error');
    }

    setIsProcessing(false);
    resetTranscript();
    
    // Reset status after delay
    setTimeout(() => {
      setVoiceStatus('idle');
    }, 2000);
  }, [language, user, socket, resetTranscript]);

  const showVoiceFeedback = (message, type = 'info') => {
    const statusElement = document.getElementById('voice-status');
    if (statusElement) {
      const feedbackDiv = document.createElement('div');
      feedbackDiv.className = `voice-listening voice-${type}`;
      feedbackDiv.textContent = message;
      statusElement.appendChild(feedbackDiv);
      
      setTimeout(() => {
        if (statusElement.contains(feedbackDiv)) {
          statusElement.removeChild(feedbackDiv);
        }
      }, 3000);
    }
  };

  const startListening = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      alert('আপনার ব্রাউজার ভয়েস রিকগনিশন সাপোর্ট করে না');
      return;
    }

    if (!voiceEnabled) {
      alert('ভয়েস কন্ট্রোল বন্ধ আছে। সেটিংস থেকে চালু করুন।');
      return;
    }

    SpeechRecognition.startListening({
      continuous: false,
      language: language,
      interimResults: false
    });
  }, [browserSupportsSpeechRecognition, voiceEnabled, language]);

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
    setVoiceStatus('idle');
  }, []);

  const toggleVoiceControl = useCallback(() => {
    setVoiceEnabled(prev => !prev);
    if (listening) {
      stopListening();
    }
  }, [listening, stopListening]);

  const changeLanguage = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    if (listening) {
      stopListening();
    }
  }, [listening, stopListening]);

  // Auto-start listening on specific key press (space bar)
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space' && event.ctrlKey && voiceEnabled) {
        event.preventDefault();
        if (listening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [listening, voiceEnabled, startListening, stopListening]);

  const value = {
    isListening,
    isProcessing,
    voiceEnabled,
    language,
    lastCommand,
    commandHistory,
    voiceStatus,
    transcript,
    startListening,
    stopListening,
    toggleVoiceControl,
    changeLanguage,
    browserSupportsSpeechRecognition,
    showVoiceFeedback,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};