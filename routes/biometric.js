const express = require('express');
const router = express.Router();
const BiometricAuth = require('../models/BiometricAuth');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Note: TensorFlow and face-api.js setup would be here in production
// For now, using improved mathematical similarity calculations

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/biometric/';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র অডিও এবং ইমেজ ফাইল গ্রহণযোগ্য'), false);
    }
  }
});

// Get biometric settings
router.get('/settings', auth, async (req, res) => {
  try {
    let biometricAuth = await BiometricAuth.findOne({ user: req.user.userId });
    
    if (!biometricAuth) {
      biometricAuth = new BiometricAuth({ user: req.user.userId });
      await biometricAuth.save();
    }

    // Don't send sensitive data
    const settings = {
      faceRecognition: {
        isEnabled: biometricAuth.faceRecognition.isEnabled,
        enrollmentDate: biometricAuth.faceRecognition.enrollmentDate,
        lastUsed: biometricAuth.faceRecognition.lastUsed,
        accuracy: biometricAuth.faceRecognition.accuracy
      },
      voiceRecognition: {
        isEnabled: biometricAuth.voiceRecognition.isEnabled,
        phraseUsed: biometricAuth.voiceRecognition.phraseUsed,
        language: biometricAuth.voiceRecognition.language,
        enrollmentDate: biometricAuth.voiceRecognition.enrollmentDate,
        lastUsed: biometricAuth.voiceRecognition.lastUsed,
        accuracy: biometricAuth.voiceRecognition.accuracy
      },
      fingerprint: {
        isEnabled: biometricAuth.fingerprint.isEnabled,
        enrollmentDate: biometricAuth.fingerprint.enrollmentDate,
        lastUsed: biometricAuth.fingerprint.lastUsed
      },
      multiModal: biometricAuth.multiModal,
      preferences: biometricAuth.preferences
    };

    res.json(settings);
  } catch (error) {
    console.error('Biometric settings error:', error);
    res.status(500).json({ message: 'বায়োমেট্রিক সেটিংস লোড করতে সমস্যা হয়েছে' });
  }
});

// Enroll face recognition
router.post('/face/enroll', auth, upload.single('faceImage'), async (req, res) => {
  try {
    const { descriptors, accuracy } = req.body;
    
    if (!descriptors) {
      return res.status(400).json({ message: 'ফেস ডেটা প্রয়োজন' });
    }

    let biometricAuth = await BiometricAuth.findOne({ user: req.user.userId });
    
    if (!biometricAuth) {
      biometricAuth = new BiometricAuth({ user: req.user.userId });
    }

    biometricAuth.faceRecognition.descriptors = descriptors;
    biometricAuth.faceRecognition.isEnabled = true;
    biometricAuth.faceRecognition.enrollmentDate = new Date();
    biometricAuth.faceRecognition.accuracy = accuracy || 0.85;

    // Add audit log
    biometricAuth.auditLog.push({
      action: 'enrollment',
      method: 'face',
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: 'Face recognition enrolled successfully'
    });

    await biometricAuth.save();

    res.json({ 
      message: 'ফেস রিকগনিশন সফলভাবে সেটআপ হয়েছে',
      isEnabled: true 
    });
  } catch (error) {
    console.error('Face enrollment error:', error);
    res.status(500).json({ message: 'ফেস রিকগনিশন সেটআপ করতে সমস্যা হয়েছে' });
  }
});

// Authenticate with face
router.post('/face/authenticate', upload.single('faceImage'), async (req, res) => {
  try {
    const { descriptors, userId } = req.body;
    
    if (!descriptors || !userId) {
      return res.status(400).json({ message: 'ফেস ডেটা এবং ইউজার আইডি প্রয়োজন' });
    }

    const biometricAuth = await BiometricAuth.findOne({ user: userId });
    
    if (!biometricAuth || !biometricAuth.faceRecognition.isEnabled) {
      return res.status(400).json({ message: 'ফেস রিকগনিশন সক্রিয় নেই' });
    }

    if (biometricAuth.isLocked()) {
      return res.status(423).json({ message: 'অ্যাকাউন্ট লক হয়ে আছে। কিছুক্ষণ পর চেষ্টা করুন।' });
    }

    // Decrypt stored face data
    const storedDescriptors = biometricAuth.decryptData(biometricAuth.faceRecognition.descriptors);
    
    // Simple similarity check (in real implementation, use proper face recognition library)
    const similarity = calculateFaceSimilarity(descriptors, storedDescriptors);
    const threshold = biometricAuth.faceRecognition.accuracy;

    // Add attempt log
    biometricAuth.faceRecognition.attempts.push({
      success: similarity >= threshold,
      confidence: similarity,
      deviceInfo: req.get('User-Agent')
    });

    if (similarity >= threshold) {
      // Authentication successful
      biometricAuth.faceRecognition.lastUsed = new Date();
      biometricAuth.resetFailedAttempts();
      
      biometricAuth.auditLog.push({
        action: 'authentication',
        method: 'face',
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: `Face authentication successful with confidence: ${similarity}`
      });

      await biometricAuth.save();

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: userId, authMethod: 'face' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );

      res.json({ 
        message: 'ফেস রিকগনিশন সফল',
        token,
        confidence: similarity,
        user: await User.findById(userId).select('-password')
      });
    } else {
      // Authentication failed
      biometricAuth.lockAccount();
      
      biometricAuth.auditLog.push({
        action: 'authentication',
        method: 'face',
        result: 'failure',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: `Face authentication failed with confidence: ${similarity}`
      });

      await biometricAuth.save();

      res.status(401).json({ 
        message: 'ফেস রিকগনিশন ব্যর্থ',
        confidence: similarity
      });
    }
  } catch (error) {
    console.error('Face authentication error:', error);
    res.status(500).json({ message: 'ফেস অথেন্টিকেশনে সমস্যা হয়েছে' });
  }
});

// Enroll voice recognition
router.post('/voice/enroll', auth, upload.single('voiceAudio'), async (req, res) => {
  try {
    const { voicePrint, phrase, language, accuracy } = req.body;
    
    if (!voicePrint || !phrase) {
      return res.status(400).json({ message: 'ভয়েস ডেটা এবং ফ্রেজ প্রয়োজন' });
    }

    let biometricAuth = await BiometricAuth.findOne({ user: req.user.userId });
    
    if (!biometricAuth) {
      biometricAuth = new BiometricAuth({ user: req.user.userId });
    }

    biometricAuth.voiceRecognition.voicePrint = voicePrint;
    biometricAuth.voiceRecognition.phraseUsed = phrase;
    biometricAuth.voiceRecognition.language = language || 'bn-BD';
    biometricAuth.voiceRecognition.isEnabled = true;
    biometricAuth.voiceRecognition.enrollmentDate = new Date();
    biometricAuth.voiceRecognition.accuracy = accuracy || 0.8;

    // Add audit log
    biometricAuth.auditLog.push({
      action: 'enrollment',
      method: 'voice',
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: 'Voice recognition enrolled successfully'
    });

    await biometricAuth.save();

    res.json({ 
      message: 'ভয়েস রিকগনিশন সফলভাবে সেটআপ হয়েছে',
      isEnabled: true,
      phrase: phrase
    });
  } catch (error) {
    console.error('Voice enrollment error:', error);
    res.status(500).json({ message: 'ভয়েস রিকগনিশন সেটআপ করতে সমস্যা হয়েছে' });
  }
});

// Authenticate with voice
router.post('/voice/authenticate', upload.single('voiceAudio'), async (req, res) => {
  try {
    const { voicePrint, phrase, userId } = req.body;
    
    if (!voicePrint || !phrase || !userId) {
      return res.status(400).json({ message: 'ভয়েস ডেটা, ফ্রেজ এবং ইউজার আইডি প্রয়োজন' });
    }

    const biometricAuth = await BiometricAuth.findOne({ user: userId });
    
    if (!biometricAuth || !biometricAuth.voiceRecognition.isEnabled) {
      return res.status(400).json({ message: 'ভয়েস রিকগনিশন সক্রিয় নেই' });
    }

    if (biometricAuth.isLocked()) {
      return res.status(423).json({ message: 'অ্যাকাউন্ট লক হয়ে আছে। কিছুক্ষণ পর চেষ্টা করুন।' });
    }

    // Check if phrase matches
    if (phrase.toLowerCase() !== biometricAuth.voiceRecognition.phraseUsed.toLowerCase()) {
      return res.status(401).json({ message: 'ভুল ফ্রেজ' });
    }

    // Decrypt stored voice data
    const storedVoicePrint = biometricAuth.decryptData(biometricAuth.voiceRecognition.voicePrint);
    
    // Simple similarity check (in real implementation, use proper voice recognition library)
    const similarity = calculateVoiceSimilarity(voicePrint, storedVoicePrint);
    const threshold = biometricAuth.voiceRecognition.accuracy;

    // Add attempt log
    biometricAuth.voiceRecognition.attempts.push({
      success: similarity >= threshold,
      confidence: similarity,
      audioQuality: 0.8 // In real implementation, calculate actual audio quality
    });

    if (similarity >= threshold) {
      // Authentication successful
      biometricAuth.voiceRecognition.lastUsed = new Date();
      biometricAuth.resetFailedAttempts();
      
      biometricAuth.auditLog.push({
        action: 'authentication',
        method: 'voice',
        result: 'success',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: `Voice authentication successful with confidence: ${similarity}`
      });

      await biometricAuth.save();

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: userId, authMethod: 'voice' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );

      res.json({ 
        message: 'ভয়েস রিকগনিশন সফল',
        token,
        confidence: similarity,
        user: await User.findById(userId).select('-password')
      });
    } else {
      // Authentication failed
      biometricAuth.lockAccount();
      
      biometricAuth.auditLog.push({
        action: 'authentication',
        method: 'voice',
        result: 'failure',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: `Voice authentication failed with confidence: ${similarity}`
      });

      await biometricAuth.save();

      res.status(401).json({ 
        message: 'ভয়েস রিকগনিশন ব্যর্থ',
        confidence: similarity
      });
    }
  } catch (error) {
    console.error('Voice authentication error:', error);
    res.status(500).json({ message: 'ভয়েস অথেন্টিকেশনে সমস্যা হয়েছে' });
  }
});

// Update biometric preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { preferences } = req.body;

    const biometricAuth = await BiometricAuth.findOne({ user: req.user.userId });
    
    if (!biometricAuth) {
      return res.status(404).json({ message: 'বায়োমেট্রিক সেটিংস পাওয়া যায়নি' });
    }

    biometricAuth.preferences = { ...biometricAuth.preferences, ...preferences };
    await biometricAuth.save();

    res.json({ 
      message: 'প্রেফারেন্স আপডেট হয়েছে',
      preferences: biometricAuth.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'প্রেফারেন্স আপডেট করতে সমস্যা হয়েছে' });
  }
});

// Disable biometric method
router.post('/disable/:method', auth, async (req, res) => {
  try {
    const { method } = req.params;
    const validMethods = ['face', 'voice', 'fingerprint'];

    if (!validMethods.includes(method)) {
      return res.status(400).json({ message: 'অবৈধ বায়োমেট্রিক পদ্ধতি' });
    }

    const biometricAuth = await BiometricAuth.findOne({ user: req.user.userId });
    
    if (!biometricAuth) {
      return res.status(404).json({ message: 'বায়োমেট্রিক সেটিংস পাওয়া যায়নি' });
    }

    if (method === 'face') {
      biometricAuth.faceRecognition.isEnabled = false;
      biometricAuth.faceRecognition.descriptors = undefined;
    } else if (method === 'voice') {
      biometricAuth.voiceRecognition.isEnabled = false;
      biometricAuth.voiceRecognition.voicePrint = undefined;
    } else if (method === 'fingerprint') {
      biometricAuth.fingerprint.isEnabled = false;
      biometricAuth.fingerprint.pattern = undefined;
    }

    // Add audit log
    biometricAuth.auditLog.push({
      action: 'disable',
      method: method,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: `${method} recognition disabled`
    });

    await biometricAuth.save();

    res.json({ message: `${method} রিকগনিশন বন্ধ করা হয়েছে` });
  } catch (error) {
    console.error('Disable biometric error:', error);
    res.status(500).json({ message: 'বায়োমেট্রিক পদ্ধতি বন্ধ করতে সমস্যা হয়েছে' });
  }
});

// Get audit log
router.get('/audit', auth, async (req, res) => {
  try {
    const biometricAuth = await BiometricAuth.findOne({ user: req.user.userId });
    
    if (!biometricAuth) {
      return res.status(404).json({ message: 'বায়োমেট্রিক সেটিংস পাওয়া যায়নি' });
    }

    const auditLog = biometricAuth.auditLog
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // Last 50 entries

    res.json(auditLog);
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ message: 'অডিট লগ লোড করতে সমস্যা হয়েছে' });
  }
});

// Helper functions for similarity calculation
function calculateFaceSimilarity(descriptors1, descriptors2) {
  try {
    const desc1 = JSON.parse(descriptors1);
    const desc2 = JSON.parse(descriptors2);
    
    if (!Array.isArray(desc1) || !Array.isArray(desc2) || desc1.length !== desc2.length) {
      return 0;
    }

    // Calculate Euclidean distance between face descriptors
    let sumSquaredDiff = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sumSquaredDiff += diff * diff;
    }
    
    const distance = Math.sqrt(sumSquaredDiff);
    
    // Convert distance to similarity (0.6 is a typical threshold for face-api.js)
    // Lower distance = higher similarity
    const threshold = 0.6;
    const similarity = Math.max(0, 1 - (distance / threshold));
    
    return similarity;
  } catch (error) {
    console.error('Face similarity calculation error:', error);
    return 0;
  }
}

function calculateVoiceSimilarity(voicePrint1, voicePrint2) {
  // In real implementation, use proper voice recognition library
  // This is a simplified version for demonstration
  try {
    const vp1 = JSON.parse(voicePrint1);
    const vp2 = JSON.parse(voicePrint2);
    
    if (!Array.isArray(vp1) || !Array.isArray(vp2) || vp1.length !== vp2.length) {
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < vp1.length; i++) {
      sum += Math.abs(vp1[i] - vp2[i]);
    }
    
    const distance = sum / vp1.length;
    return Math.max(0, 1 - distance); // Convert distance to similarity
  } catch (error) {
    return 0;
  }
}

module.exports = router;
