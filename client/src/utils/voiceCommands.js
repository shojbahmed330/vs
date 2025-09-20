import axios from 'axios';

// Enhanced Voice commands configuration with all new features
const voiceCommands = {
  // Navigation commands
  navigation: {
    bengali: {
      'হোম যাও': 'navigateToHome',
      'হোমে যাও': 'navigateToHome',
      'বাসায় যাও': 'navigateToHome',
      'প্রোফাইল যাও': 'navigateToProfile',
      'প্রোফাইলে যাও': 'navigateToProfile',
      'মেসেজ যাও': 'navigateToMessages',
      'মেসেজে যাও': 'navigateToMessages',
      'চ্যাট যাও': 'navigateToMessages',
      'চ্যাটে যাও': 'navigateToMessages',
      'সেটিংস যাও': 'navigateToSettings',
      'সেটিংসে যাও': 'navigateToSettings',
      'গ্রুপ যাও': 'navigateToGroups',
      'গ্রুপে যাও': 'navigateToGroups',
      'স্টোরি যাও': 'navigateToStories',
      'স্টোরিজ যাও': 'navigateToStories',
      'ইভেন্ট যাও': 'navigateToEvents',
      'ইভেন্টস যাও': 'navigateToEvents',
      'পেজ যাও': 'navigateToPages',
      'পেজে যাও': 'navigateToPages',
      'মার্কেটপ্লেস যাও': 'navigateToMarketplace',
      'বাজার যাও': 'navigateToMarketplace',
      'লাইভ যাও': 'navigateToLive',
      'লাইভ ভিডিও যাও': 'navigateToLive'
    },
    english: {
      'go home': 'navigateToHome',
      'go to home': 'navigateToHome',
      'navigate home': 'navigateToHome',
      'home page': 'navigateToHome',
      'go to profile': 'navigateToProfile',
      'my profile': 'navigateToProfile',
      'open profile': 'navigateToProfile',
      'go to messages': 'navigateToMessages',
      'open messages': 'navigateToMessages',
      'open chat': 'navigateToMessages',
      'go to settings': 'navigateToSettings',
      'open settings': 'navigateToSettings',
      'go to groups': 'navigateToGroups',
      'open groups': 'navigateToGroups',
      'go to stories': 'navigateToStories',
      'open stories': 'navigateToStories',
      'go to events': 'navigateToEvents',
      'open events': 'navigateToEvents',
      'go to pages': 'navigateToPages',
      'open pages': 'navigateToPages',
      'go to marketplace': 'navigateToMarketplace',
      'open marketplace': 'navigateToMarketplace',
      'go to live': 'navigateToLive',
      'open live videos': 'navigateToLive'
    }
  },

  // Feed controls
  feed: {
    bengali: {
      'স্ক্রল করো': 'scrollDown',
      'নিচে স্ক্রল করো': 'scrollDown',
      'আরো দেখো': 'scrollDown',
      'স্ক্রল বন্ধ করো': 'stopScroll',
      'স্ক্রল স্টপ': 'stopScroll',
      'উপরে স্ক্রল করো': 'scrollUp',
      'পেছনে যাও': 'scrollUp',
      'রিফ্রেশ করো': 'refreshFeed',
      'নতুন পোস্ট লোড করো': 'refreshFeed',
      'অটো স্ক্রল শুরু করো': 'startAutoScroll',
      'অটো স্ক্রল বন্ধ করো': 'stopAutoScroll'
    },
    english: {
      'scroll down': 'scrollDown',
      'scroll': 'scrollDown',
      'keep scrolling': 'scrollDown',
      'more posts': 'scrollDown',
      'stop scrolling': 'stopScroll',
      'stop scroll': 'stopScroll',
      'scroll up': 'scrollUp',
      'go back': 'scrollUp',
      'refresh feed': 'refreshFeed',
      'reload posts': 'refreshFeed',
      'start auto scroll': 'startAutoScroll',
      'stop auto scroll': 'stopAutoScroll'
    }
  },

  // Post interactions
  posts: {
    bengali: {
      'লাইক করো': 'likePost',
      'লাইক দাও': 'likePost',
      'পছন্দ করো': 'likePost',
      'ভালোবাসা দাও': 'lovePost',
      'লাভ দাও': 'lovePost',
      'হাসি দাও': 'laughPost',
      'রেগে যাও': 'angryPost',
      'দুঃখ দাও': 'sadPost',
      'বিস্মিত হও': 'wowPost',
      'আনলাইক করো': 'unlikePost',
      'লাইক সরাও': 'unlikePost',
      'কমেন্ট করো': 'commentOnPost',
      'মন্তব্য করো': 'commentOnPost',
      'কমেন্ট লেখো': 'commentOnPost',
      'শেয়ার করো': 'sharePost',
      'পোস্ট শেয়ার করো': 'sharePost',
      'পোস্ট সেভ করো': 'savePost',
      'পোস্ট রিপোর্ট করো': 'reportPost'
    },
    english: {
      'like this': 'likePost',
      'like post': 'likePost',
      'give like': 'likePost',
      'love this': 'lovePost',
      'love post': 'lovePost',
      'laugh at this': 'laughPost',
      'haha react': 'laughPost',
      'angry react': 'angryPost',
      'sad react': 'sadPost',
      'wow react': 'wowPost',
      'unlike this': 'unlikePost',
      'remove like': 'unlikePost',
      'comment on this': 'commentOnPost',
      'add comment': 'commentOnPost',
      'write comment': 'commentOnPost',
      'share this': 'sharePost',
      'share post': 'sharePost',
      'save post': 'savePost',
      'report post': 'reportPost'
    }
  },

  // Profile interactions
  profile: {
    bengali: {
      '(.+) এর প্রোফাইলে যাও': 'navigateToUserProfile',
      '(.+) এর প্রোফাইল দেখো': 'navigateToUserProfile',
      '(.+) কে ফ্রেন্ড রিকুয়েস্ট পাঠাও': 'sendFriendRequest',
      '(.+) কে বন্ধুত্বের আমন্ত্রণ পাঠাও': 'sendFriendRequest',
      '(.+) কে ফলো করো': 'followUser',
      '(.+) কে আনফলো করো': 'unfollowUser',
      'প্রোফাইল এডিট করো': 'editProfile',
      'প্রোফাইল সম্পাদনা করো': 'editProfile',
      'কভার ফটো পরিবর্তন করো': 'changeCoverPhoto',
      'প্রোফাইল পিকচার পরিবর্তন করো': 'changeProfilePicture'
    },
    english: {
      'go to (.+) profile': 'navigateToUserProfile',
      'visit (.+) profile': 'navigateToUserProfile',
      'open (.+) profile': 'navigateToUserProfile',
      'send friend request to (.+)': 'sendFriendRequest',
      'add (.+) as friend': 'sendFriendRequest',
      'follow (.+)': 'followUser',
      'unfollow (.+)': 'unfollowUser',
      'edit profile': 'editProfile',
      'update profile': 'editProfile',
      'change cover photo': 'changeCoverPhoto',
      'change profile picture': 'changeProfilePicture'
    }
  },

  // Messaging
  messaging: {
    bengali: {
      '(.+) কে মেসেজ পাঠাও': 'sendMessage',
      '(.+) কে চ্যাট করো': 'openChat',
      '(.+) এর সাথে চ্যাট খোলো': 'openChat',
      'ভয়েস মেসেজ পাঠাও': 'sendVoiceMessage',
      'অডিও মেসেজ পাঠাও': 'sendVoiceMessage',
      '(.+) কে ভিডিও কল দাও': 'startVideoCall',
      '(.+) কে অডিও কল দাও': 'startAudioCall',
      'কল রিসিভ করো': 'acceptCall',
      'কল কেটে দাও': 'endCall'
    },
    english: {
      'send message to (.+)': 'sendMessage',
      'message (.+)': 'sendMessage',
      'chat with (.+)': 'openChat',
      'open chat with (.+)': 'openChat',
      'send voice message': 'sendVoiceMessage',
      'send audio message': 'sendVoiceMessage',
      'video call (.+)': 'startVideoCall',
      'call (.+)': 'startAudioCall',
      'accept call': 'acceptCall',
      'end call': 'endCall',
      'hang up': 'endCall'
    }
  },

  // Stories
  stories: {
    bengali: {
      'স্টোরি তৈরি করো': 'createStory',
      'নতুন স্টোরি পোস্ট করো': 'createStory',
      'স্টোরি আপলোড করো': 'uploadStory',
      '(.+) এর স্টোরি দেখো': 'viewUserStory',
      'পরের স্টোরি দেখো': 'nextStory',
      'আগের স্টোরি দেখো': 'previousStory',
      'স্টোরি পজ করো': 'pauseStory',
      'স্টোরি প্লে করো': 'playStory'
    },
    english: {
      'create story': 'createStory',
      'post new story': 'createStory',
      'upload story': 'uploadStory',
      'view (.+) story': 'viewUserStory',
      'next story': 'nextStory',
      'previous story': 'previousStory',
      'pause story': 'pauseStory',
      'play story': 'playStory'
    }
  },

  // Events
  events: {
    bengali: {
      'ইভেন্ট তৈরি করো': 'createEvent',
      'নতুন ইভেন্ট বানাও': 'createEvent',
      'ইভেন্ট খোঁজো': 'searchEvents',
      '(.+) ইভেন্টে যাবো': 'joinEvent',
      '(.+) ইভেন্টে আগ্রহী': 'interestedInEvent',
      'আমার ইভেন্ট দেখো': 'viewMyEvents',
      'আগামী ইভেন্ট দেখো': 'viewUpcomingEvents'
    },
    english: {
      'create event': 'createEvent',
      'make new event': 'createEvent',
      'search events': 'searchEvents',
      'join (.+) event': 'joinEvent',
      'interested in (.+) event': 'interestedInEvent',
      'view my events': 'viewMyEvents',
      'show upcoming events': 'viewUpcomingEvents'
    }
  },

  // Pages
  pages: {
    bengali: {
      'পেজ তৈরি করো': 'createPage',
      'নতুন পেজ বানাও': 'createPage',
      '(.+) পেজ খোঁজো': 'searchPage',
      '(.+) পেজ লাইক করো': 'likePage',
      '(.+) পেজ ফলো করো': 'followPage',
      'আমার পেজ দেখো': 'viewMyPages',
      'পেজ রিভিউ লেখো': 'writePageReview'
    },
    english: {
      'create page': 'createPage',
      'make new page': 'createPage',
      'search (.+) page': 'searchPage',
      'like (.+) page': 'likePage',
      'follow (.+) page': 'followPage',
      'view my pages': 'viewMyPages',
      'write page review': 'writePageReview'
    }
  },

  // Marketplace
  marketplace: {
    bengali: {
      'কিছু বেচো': 'sellItem',
      'পণ্য বিক্রি করো': 'sellItem',
      '(.+) খোঁজো': 'searchMarketplace',
      '(.+) কিনতে চাই': 'buyItem',
      'আমার বিক্রয় দেখো': 'viewMySales',
      'অর্ডার দেখো': 'viewOrders'
    },
    english: {
      'sell something': 'sellItem',
      'sell item': 'sellItem',
      'search for (.+)': 'searchMarketplace',
      'buy (.+)': 'buyItem',
      'view my sales': 'viewMySales',
      'show orders': 'viewOrders'
    }
  },

  // Live streaming
  live: {
    bengali: {
      'লাইভ শুরু করো': 'startLiveStream',
      'লাইভ যাও': 'goLive',
      'লাইভ বন্ধ করো': 'endLiveStream',
      'লাইভ কমেন্ট করো': 'commentOnLive',
      'লাইভ শেয়ার করো': 'shareLiveStream'
    },
    english: {
      'start live': 'startLiveStream',
      'go live': 'goLive',
      'end live': 'endLiveStream',
      'comment on live': 'commentOnLive',
      'share live stream': 'shareLiveStream'
    }
  },

  // Biometric authentication
  biometric: {
    bengali: {
      'ফেস আনলক করো': 'unlockWithFace',
      'ভয়েস আনলক করো': 'unlockWithVoice',
      'বায়োমেট্রিক সেটাপ করো': 'setupBiometric',
      'ফেস রেজিস্ট্রেশন করো': 'registerFace',
      'ভয়েস রেজিস্ট্রেশন করো': 'registerVoice'
    },
    english: {
      'unlock with face': 'unlockWithFace',
      'unlock with voice': 'unlockWithVoice',
      'setup biometric': 'setupBiometric',
      'register face': 'registerFace',
      'register voice': 'registerVoice'
    }
  },

  // Memory/On this day
  memories: {
    bengali: {
      'স্মৃতি দেখো': 'viewMemories',
      'আজকের মতো দিনে': 'viewOnThisDay',
      'পুরাতন পোস্ট দেখো': 'viewOldPosts',
      'স্মৃতি শেয়ার করো': 'shareMemory'
    },
    english: {
      'view memories': 'viewMemories',
      'on this day': 'viewOnThisDay',
      'view old posts': 'viewOldPosts',
      'share memory': 'shareMemory'
    }
  },

  // General controls
  general: {
    bengali: {
      'পোস্ট তৈরি করো': 'createPost',
      'নতুন পোস্ট লেখো': 'createPost',
      'ছবি আপলোড করো': 'uploadPhoto',
      'ভিডিও আপলোড করো': 'uploadVideo',
      'সার্চ করো': 'openSearch',
      'খোঁজো': 'openSearch',
      'নোটিফিকেশন দেখো': 'openNotifications',
      'বিজ্ঞপ্তি দেখো': 'openNotifications',
      'ভয়েস কন্ট্রোল বন্ধ করো': 'disableVoiceControl',
      'ভয়েস কন্ট্রোল চালু করো': 'enableVoiceControl',
      'হেল্প দেখো': 'showHelp',
      'সাহায্য দেখো': 'showHelp',
      'ভাষা পরিবর্তন করো': 'changeLanguage',
      'ডার্ক মোড চালু করো': 'enableDarkMode',
      'লাইট মোড চালু করো': 'enableLightMode'
    },
    english: {
      'create post': 'createPost',
      'write new post': 'createPost',
      'make post': 'createPost',
      'upload photo': 'uploadPhoto',
      'upload image': 'uploadPhoto',
      'upload video': 'uploadVideo',
      'open search': 'openSearch',
      'search for': 'openSearch',
      'show notifications': 'openNotifications',
      'open notifications': 'openNotifications',
      'disable voice control': 'disableVoiceControl',
      'enable voice control': 'enableVoiceControl',
      'show help': 'showHelp',
      'open help': 'showHelp',
      'change language': 'changeLanguage',
      'enable dark mode': 'enableDarkMode',
      'enable light mode': 'enableLightMode'
    }
  }
};

// Enhanced Voice Command Processor
class EnhancedVoiceCommands {
  constructor() {
    this.scrollInterval = null;
    this.autoScrollInterval = null;
    this.isListening = false;
    this.recognition = null;
    this.currentLanguage = 'bn-BD';
    this.feedbackMessages = {
      bengali: {
        commandNotRecognized: 'কমান্ড বুঝতে পারিনি',
        commandExecuted: 'কমান্ড সম্পন্ন হয়েছে',
        navigationSuccess: 'সফলভাবে পৌঁছেছেন',
        scrollStarted: 'স্ক্রল শুরু হয়েছে',
        scrollStopped: 'স্ক্রল বন্ধ হয়েছে',
        postLiked: 'পোস্ট লাইক করা হয়েছে',
        messageMode: 'মেসেজ মোড চালু',
        voiceControlDisabled: 'ভয়েস কন্ট্রোল বন্ধ',
        voiceControlEnabled: 'ভয়েস কন্ট্রোল চালু'
      },
      english: {
        commandNotRecognized: 'Command not recognized',
        commandExecuted: 'Command executed',
        navigationSuccess: 'Navigation successful',
        scrollStarted: 'Scrolling started',
        scrollStopped: 'Scrolling stopped',
        postLiked: 'Post liked',
        messageMode: 'Message mode activated',
        voiceControlDisabled: 'Voice control disabled',
        voiceControlEnabled: 'Voice control enabled'
      }
    };
    this.setupSpeechRecognition();
  }

  setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;

      this.recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          this.processVoiceCommand(lastResult[0].transcript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.showFeedback('Voice recognition error: ' + event.error);
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          this.recognition.start();
        }
      };
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      this.recognition.start();
      this.showFeedback(this.currentLanguage.includes('bn') ? 'ভয়েস কন্ট্রোল চালু' : 'Voice control enabled');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      this.showFeedback(this.currentLanguage.includes('bn') ? 'ভয়েস কন্ট্রোল বন্ধ' : 'Voice control disabled');
    }
  }

  changeLanguage(language) {
    this.currentLanguage = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  processVoiceCommand(command) {
    const cleanCommand = command.toLowerCase().trim();
    const isEnglish = this.currentLanguage.includes('en');
    const language = isEnglish ? 'english' : 'bengali';

    console.log(`Processing ${language} command:`, cleanCommand);

    // Try to match command with patterns
    for (const [category, commands] of Object.entries(voiceCommands)) {
      const langCommands = commands[language];
      if (!langCommands) continue;

      for (const [pattern, action] of Object.entries(langCommands)) {
        // Handle regex patterns
        if (pattern.includes('(.+)')) {
          const regex = new RegExp(pattern.replace('(.+)', '(\\w+)'), 'i');
          const match = cleanCommand.match(regex);
          if (match) {
            this.executeCommand(action, match[1], category);
            return;
          }
        } else {
          // Handle exact matches
          if (cleanCommand.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(cleanCommand)) {
            this.executeCommand(action, null, category);
            return;
          }
        }
      }
    }

    // Command not recognized
    this.showFeedback(
      this.currentLanguage.includes('bn') 
        ? this.feedbackMessages.bengali.commandNotRecognized
        : this.feedbackMessages.english.commandNotRecognized
    );
  }

  executeCommand(action, parameter, category) {
    console.log(`Executing command: ${action}`, parameter, category);
    
    switch (action) {
      // Navigation commands
      case 'navigateToHome':
        this.navigate('/');
        break;
      case 'navigateToProfile':
        this.navigate('/profile');
        break;
      case 'navigateToMessages':
        this.navigate('/messages');
        break;
      case 'navigateToSettings':
        this.navigate('/settings');
        break;
      case 'navigateToGroups':
        this.navigate('/groups');
        break;
      case 'navigateToStories':
        this.navigate('/stories');
        break;
      case 'navigateToEvents':
        this.navigate('/events');
        break;
      case 'navigateToPages':
        this.navigate('/pages');
        break;
      case 'navigateToMarketplace':
        this.navigate('/marketplace');
        break;
      case 'navigateToLive':
        this.navigate('/live');
        break;
      case 'navigateToUserProfile':
        this.navigateToUserProfile(parameter);
        break;

      // Feed controls
      case 'scrollDown':
        this.startScrolling('down');
        break;
      case 'scrollUp':
        this.startScrolling('up');
        break;
      case 'stopScroll':
        this.stopScrolling();
        break;
      case 'refreshFeed':
        this.refreshFeed();
        break;
      case 'startAutoScroll':
        this.startAutoScrolling();
        break;
      case 'stopAutoScroll':
        this.stopAutoScrolling();
        break;

      // Post interactions
      case 'likePost':
        this.likeCurrentPost();
        break;
      case 'lovePost':
        this.reactToPost('love');
        break;
      case 'laughPost':
        this.reactToPost('laugh');
        break;
      case 'angryPost':
        this.reactToPost('angry');
        break;
      case 'sadPost':
        this.reactToPost('sad');
        break;
      case 'wowPost':
        this.reactToPost('wow');
        break;
      case 'commentOnPost':
        this.openCommentDialog();
        break;
      case 'sharePost':
        this.shareCurrentPost();
        break;

      // Stories
      case 'createStory':
        this.createStory();
        break;
      case 'viewUserStory':
        this.viewUserStory(parameter);
        break;
      case 'nextStory':
        this.navigateStory('next');
        break;
      case 'previousStory':
        this.navigateStory('previous');
        break;

      // Events
      case 'createEvent':
        this.createEvent();
        break;
      case 'searchEvents':
        this.searchEvents();
        break;
      case 'viewMyEvents':
        this.navigate('/events/my-events');
        break;

      // Pages
      case 'createPage':
        this.createPage();
        break;
      case 'likePage':
        this.likePage(parameter);
        break;
      case 'viewMyPages':
        this.navigate('/pages/my-pages');
        break;

      // Marketplace
      case 'sellItem':
        this.navigate('/marketplace/sell');
        break;
      case 'searchMarketplace':
        this.searchMarketplace(parameter);
        break;

      // Live streaming
      case 'startLiveStream':
        this.startLiveStream();
        break;
      case 'endLiveStream':
        this.endLiveStream();
        break;

      // Biometric
      case 'setupBiometric':
        this.navigate('/settings/biometric');
        break;
      case 'unlockWithFace':
        this.unlockWithBiometric('face');
        break;
      case 'unlockWithVoice':
        this.unlockWithBiometric('voice');
        break;

      // Messaging
      case 'sendMessage':
        this.openMessageDialog(parameter);
        break;
      case 'openChat':
        this.openChat(parameter);
        break;
      case 'sendVoiceMessage':
        this.startVoiceMessage();
        break;

      // General
      case 'createPost':
        this.openCreatePost();
        break;
      case 'openSearch':
        this.openSearch();
        break;
      case 'openNotifications':
        this.openNotifications();
        break;
      case 'disableVoiceControl':
        this.stopListening();
        break;
      case 'enableVoiceControl':
        this.startListening();
        break;
      case 'showHelp':
        this.showVoiceHelp();
        break;
      case 'changeLanguage':
        this.toggleLanguage();
        break;
      case 'enableDarkMode':
        this.toggleTheme('dark');
        break;
      case 'enableLightMode':
        this.toggleTheme('light');
        break;

      default:
        this.showFeedback('Unknown command');
    }
  }

  // Navigation helper
  navigate(path) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      this.showFeedback(
        this.currentLanguage.includes('bn') 
          ? this.feedbackMessages.bengali.navigationSuccess
          : this.feedbackMessages.english.navigationSuccess
      );
    }
  }

  // Scrolling functions
  startScrolling(direction) {
    this.stopScrolling();
    const scrollAmount = direction === 'down' ? 300 : -300;
    this.scrollInterval = setInterval(() => {
      window.scrollBy(0, scrollAmount);
    }, 1000);
    this.showFeedback(
      this.currentLanguage.includes('bn') 
        ? this.feedbackMessages.bengali.scrollStarted
        : this.feedbackMessages.english.scrollStarted
    );
  }

  stopScrolling() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
      this.showFeedback(
        this.currentLanguage.includes('bn') 
          ? this.feedbackMessages.bengali.scrollStopped
          : this.feedbackMessages.english.scrollStopped
      );
    }
  }

  startAutoScrolling() {
    this.stopAutoScrolling();
    this.autoScrollInterval = setInterval(() => {
      window.scrollBy(0, 100);
    }, 2000);
  }

  stopAutoScrolling() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  // Post interaction functions
  likeCurrentPost() {
    const posts = document.querySelectorAll('[data-post-id]');
    if (posts.length > 0) {
      const likeButton = posts[0].querySelector('[data-action="like"], .like-button, button[aria-label*="Like"]');
      if (likeButton) {
        likeButton.click();
        this.showFeedback(
          this.currentLanguage.includes('bn') 
            ? this.feedbackMessages.bengali.postLiked
            : this.feedbackMessages.english.postLiked
        );
      }
    }
  }

  reactToPost(reactionType) {
    const posts = document.querySelectorAll('[data-post-id]');
    if (posts.length > 0) {
      const reactionButton = posts[0].querySelector(`[data-action="${reactionType}"], .${reactionType}-button`);
      if (reactionButton) {
        reactionButton.click();
        this.showFeedback(`${reactionType} reaction added`);
      }
    }
  }

  openCommentDialog() {
    const posts = document.querySelectorAll('[data-post-id]');
    if (posts.length > 0) {
      const commentButton = posts[0].querySelector('[data-action="comment"], .comment-button');
      if (commentButton) {
        commentButton.click();
        this.showFeedback('Comment dialog opened');
      }
    }
  }

  shareCurrentPost() {
    const posts = document.querySelectorAll('[data-post-id]');
    if (posts.length > 0) {
      const shareButton = posts[0].querySelector('[data-action="share"], .share-button');
      if (shareButton) {
        shareButton.click();
        this.showFeedback('Share dialog opened');
      }
    }
  }

  // Create functions
  openCreatePost() {
    const createButton = document.querySelector('[data-action="create-post"], .create-post-button, button[aria-label*="Create"]');
    if (createButton) {
      createButton.click();
      this.showFeedback('Create post dialog opened');
    } else {
      this.navigate('/create-post');
    }
  }

  createStory() {
    const createStoryButton = document.querySelector('[data-action="create-story"], .create-story-button');
    if (createStoryButton) {
      createStoryButton.click();
    } else {
      this.navigate('/stories/create');
    }
  }

  createEvent() {
    this.navigate('/events/create');
  }

  createPage() {
    this.navigate('/pages/create');
  }

  // Search functions
  openSearch() {
    const searchButton = document.querySelector('[data-action="search"], .search-button, input[type="search"]');
    if (searchButton) {
      searchButton.focus();
      this.showFeedback('Search activated');
    }
  }

  searchEvents() {
    this.navigate('/events');
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="event"], input[placeholder*="ইভেন্ট"]');
      if (searchInput) {
        searchInput.focus();
      }
    }, 500);
  }

  searchMarketplace(query) {
    this.navigate('/marketplace');
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="search"], input[placeholder*="খোঁজ"]');
      if (searchInput && query) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 500);
  }

  // Utility functions
  refreshFeed() {
    window.location.reload();
  }

  openNotifications() {
    const notificationButton = document.querySelector('[data-action="notifications"], .notifications-button');
    if (notificationButton) {
      notificationButton.click();
    } else {
      this.navigate('/notifications');
    }
  }

  toggleLanguage() {
    const newLanguage = this.currentLanguage.includes('bn') ? 'en-US' : 'bn-BD';
    this.changeLanguage(newLanguage);
    this.showFeedback(`Language changed to ${newLanguage.includes('bn') ? 'Bengali' : 'English'}`);
  }

  toggleTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.body.classList.toggle('light-mode', theme === 'light');
    this.showFeedback(`${theme} mode enabled`);
  }

  showVoiceHelp() {
    const helpContent = this.currentLanguage.includes('bn') 
      ? `ভয়েস কমান্ড সাহায্য:\n- "হোম যাও" - হোমপেজে যেতে\n- "স্ক্রল করো" - নিচে স্ক্রল করতে\n- "লাইক করো" - পোস্ট লাইক করতে\n- "মেসেজ পাঠাও" - মেসেজ পাঠাতে`
      : `Voice Command Help:\n- "Go home" - Navigate to homepage\n- "Scroll down" - Scroll down the feed\n- "Like post" - Like current post\n- "Send message" - Send a message`;
    
    alert(helpContent);
  }

  // Biometric functions
  unlockWithBiometric(type) {
    this.navigate(`/auth/biometric/${type}`);
  }

  // Live streaming
  startLiveStream() {
    this.navigate('/live/create');
  }

  endLiveStream() {
    const endButton = document.querySelector('[data-action="end-live"], .end-live-button');
    if (endButton) {
      endButton.click();
    }
  }

  // Messaging
  openMessageDialog(username) {
    if (username) {
      this.navigate(`/messages/${username}`);
    } else {
      this.navigate('/messages');
    }
  }

  openChat(username) {
    this.openMessageDialog(username);
  }

  startVoiceMessage() {
    const voiceButton = document.querySelector('[data-action="voice-message"], .voice-message-button');
    if (voiceButton) {
      voiceButton.click();
      this.showFeedback('Voice message recording started');
    }
  }

  // Story navigation
  navigateStory(direction) {
    const button = direction === 'next' 
      ? document.querySelector('[data-action="next-story"], .next-story-button')
      : document.querySelector('[data-action="prev-story"], .prev-story-button');
    
    if (button) {
      button.click();
    } else {
      // Use keyboard navigation
      const key = direction === 'next' ? 'ArrowRight' : 'ArrowLeft';
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
    }
  }

  viewUserStory(username) {
    this.navigate(`/stories/${username}`);
  }

  // User profile navigation
  async navigateToUserProfile(username) {
    if (!username) return;
    
    try {
      const response = await axios.get(`/api/users/search?q=${username}`);
      if (response.data.users && response.data.users.length > 0) {
        const userId = response.data.users[0]._id;
        this.navigate(`/profile/${userId}`);
      } else {
        this.showFeedback('User not found');
      }
    } catch (error) {
      this.showFeedback('Failed to find user');
    }
  }

  // Page interactions
  likePage(pageName) {
    if (pageName) {
      this.navigate(`/pages/search?q=${pageName}`);
    }
  }

  // Feedback system
  showFeedback(message) {
    // Create or update feedback element
    let feedbackElement = document.getElementById('voice-feedback');
    if (!feedbackElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.id = 'voice-feedback';
      feedbackElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 10000;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(feedbackElement);
    }
    
    feedbackElement.textContent = message;
    feedbackElement.style.opacity = '1';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
    }, 3000);
    
    // Speak the feedback
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = this.currentLanguage;
      utterance.volume = 0.5;
      speechSynthesis.speak(utterance);
    }
  }
}

// Export the enhanced voice commands system
export default EnhancedVoiceCommands;

// Initialize global instance
window.voiceCommands = new EnhancedVoiceCommands();

// Keyboard shortcut to toggle voice control (Ctrl+Space)
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.code === 'Space') {
    event.preventDefault();
    if (window.voiceCommands.isListening) {
      window.voiceCommands.stopListening();
    } else {
      window.voiceCommands.startListening();
    }
  }
});

console.log('Enhanced Voice Commands system loaded. Press Ctrl+Space to toggle voice control.');
