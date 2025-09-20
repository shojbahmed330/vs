import React, { createContext, useContext, useState, useEffect } from 'react';
import Dexie from 'dexie';

const PWAContext = createContext();

// IndexedDB database for offline storage
class SocialMediaDB extends Dexie {
  constructor() {
    super('SocialMediaDB');
    this.version(1).stores({
      posts: '++id, userId, content, createdAt, isOffline',
      users: 'id, username, firstName, lastName, avatar',
      messages: '++id, chatId, senderId, content, createdAt, isOffline',
      notifications: '++id, userId, type, content, createdAt, read',
      drafts: '++id, type, content, createdAt'
    });
  }
}

const db = new SocialMediaDB();

export const PWAProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error

  useEffect(() => {
    // Check if app is installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      console.log('Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
    } catch (error) {
      console.error('Install error:', error);
    }
    
    return false;
  };

  const saveOfflineData = async (type, data) => {
    try {
      switch (type) {
        case 'post':
          await db.posts.add({ ...data, isOffline: true });
          break;
        case 'message':
          await db.messages.add({ ...data, isOffline: true });
          break;
        case 'draft':
          await db.drafts.add({ type: 'post', content: data, createdAt: new Date() });
          break;
        default:
          console.warn('Unknown offline data type:', type);
      }
      
      // Add to offline queue for syncing later
      setOfflineQueue(prev => [...prev, { type, data, timestamp: Date.now() }]);
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const getOfflineData = async (type) => {
    try {
      switch (type) {
        case 'posts':
          return await db.posts.toArray();
        case 'messages':
          return await db.messages.toArray();
        case 'users':
          return await db.users.toArray();
        case 'drafts':
          return await db.drafts.toArray();
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting offline data:', error);
      return [];
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline || offlineQueue.length === 0) return;

    setSyncStatus('syncing');

    try {
      // Sync offline posts
      const offlinePosts = await db.posts.where('isOffline').equals(true).toArray();
      for (const post of offlinePosts) {
        try {
          // Send to server
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              content: post.content,
              media: post.media
            })
          });

          if (response.ok) {
            // Remove from offline storage
            await db.posts.delete(post.id);
          }
        } catch (error) {
          console.error('Error syncing post:', error);
        }
      }

      // Sync offline messages
      const offlineMessages = await db.messages.where('isOffline').equals(true).toArray();
      for (const message of offlineMessages) {
        try {
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              chatId: message.chatId,
              content: message.content
            })
          });

          if (response.ok) {
            await db.messages.delete(message.id);
          }
        } catch (error) {
          console.error('Error syncing message:', error);
        }
      }

      setOfflineQueue([]);
      setSyncStatus('synced');
      
      // Reset sync status after 3 seconds
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const clearOfflineData = async () => {
    try {
      await db.posts.clear();
      await db.messages.clear();
      await db.drafts.clear();
      setOfflineQueue([]);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  const saveDraft = async (content, type = 'post') => {
    try {
      await db.drafts.add({
        type,
        content,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const getDrafts = async () => {
    try {
      return await db.drafts.orderBy('createdAt').reverse().toArray();
    } catch (error) {
      console.error('Error getting drafts:', error);
      return [];
    }
  };

  const deleteDraft = async (id) => {
    try {
      await db.drafts.delete(id);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const value = {
    isOnline,
    isInstallable,
    isInstalled,
    installApp,
    saveOfflineData,
    getOfflineData,
    syncOfflineData,
    clearOfflineData,
    offlineQueue: offlineQueue.length,
    syncStatus,
    saveDraft,
    getDrafts,
    deleteDraft,
    db
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAContext;
