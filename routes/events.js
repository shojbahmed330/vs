const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for event cover photo uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/events/';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র ইমেজ ফাইল গ্রহণযোগ্য'), false);
    }
  }
});

// Create a new event
router.post('/', auth, upload.single('coverPhoto'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      startDate,
      endDate,
      isAllDay,
      location,
      eventType,
      maxAttendees,
      ticketPrice,
      tags
    } = req.body;

    const eventData = {
      title,
      description,
      organizer: req.user.userId,
      category,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAllDay: isAllDay === 'true',
      eventType: eventType || 'public'
    };

    // Handle cover photo upload
    if (req.file) {
      eventData.coverPhoto = `/uploads/events/${req.file.filename}`;
    }

    // Parse location if provided
    if (location) {
      eventData.location = JSON.parse(location);
    }

    // Handle max attendees
    if (maxAttendees) {
      eventData.maxAttendees = parseInt(maxAttendees);
    }

    // Handle ticket pricing
    if (ticketPrice) {
      eventData.ticketPrice = JSON.parse(ticketPrice);
    }

    // Handle tags
    if (tags) {
      eventData.tags = JSON.parse(tags);
    }

    const event = new Event(eventData);
    await event.save();

    // Populate organizer info
    await event.populate('organizer', 'username fullName avatar');

    res.status(201).json({
      message: 'ইভেন্ট সফলভাবে তৈরি হয়েছে',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'ইভেন্ট তৈরি করতে সমস্যা হয়েছে' });
  }
});

// Get events feed
router.get('/feed', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, location } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {
      isActive: true,
      startDate: { $gte: new Date() }, // Only future events
      $or: [
        { eventType: 'public' },
        { organizer: req.user.userId },
        { 'attendees.going.user': req.user.userId },
        { 'attendees.interested.user': req.user.userId },
        { 'attendees.invited.user': req.user.userId }
      ]
    };

    if (category) {
      filter.category = category;
    }

    if (location) {
      filter['location.name'] = { $regex: location, $options: 'i' };
    }

    const events = await Event.find(filter)
      .populate('organizer', 'username fullName avatar')
      .populate('coOrganizers', 'username fullName avatar')
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Event.countDocuments(filter);

    // Add attendance info for current user
    const eventsWithAttendance = events.map(event => {
      const eventObj = event.toObject();
      const userId = req.user.userId;

      eventObj.userAttendance = {
        isGoing: event.attendees.going.some(a => a.user.toString() === userId),
        isInterested: event.attendees.interested.some(a => a.user.toString() === userId),
        isInvited: event.attendees.invited.some(a => a.user.toString() === userId),
        isOrganizer: event.organizer._id.toString() === userId
      };

      eventObj.attendeeCounts = {
        going: event.attendees.going.length,
        interested: event.attendees.interested.length,
        invited: event.attendees.invited.length
      };

      return eventObj;
    });

    res.json({
      events: eventsWithAttendance,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        hasNext: skip + events.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get events feed error:', error);
    res.status(500).json({ message: 'ইভেন্ট ফিড লোড করতে সমস্যা হয়েছে' });
  }
});

// Get event by ID
router.get('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('organizer', 'username fullName avatar')
      .populate('coOrganizers', 'username fullName avatar')
      .populate('attendees.going.user', 'username fullName avatar')
      .populate('attendees.interested.user', 'username fullName avatar')
      .populate('attendees.invited.user', 'username fullName avatar')
      .populate('discussion.author', 'username fullName avatar');

    if (!event) {
      return res.status(404).json({ message: 'ইভেন্ট পাওয়া যায়নি' });
    }

    // Check if user has access to this event
    const userId = req.user.userId;
    const hasAccess = 
      event.eventType === 'public' ||
      event.organizer._id.toString() === userId ||
      event.coOrganizers.some(co => co._id.toString() === userId) ||
      event.attendees.going.some(a => a.user._id.toString() === userId) ||
      event.attendees.interested.some(a => a.user._id.toString() === userId) ||
      event.attendees.invited.some(a => a.user._id.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'এই ইভেন্ট দেখার অনুমতি নেই' });
    }

    const eventObj = event.toObject();
    eventObj.userAttendance = {
      isGoing: event.attendees.going.some(a => a.user._id.toString() === userId),
      isInterested: event.attendees.interested.some(a => a.user._id.toString() === userId),
      isInvited: event.attendees.invited.some(a => a.user._id.toString() === userId),
      isOrganizer: event.organizer._id.toString() === userId,
      isCoOrganizer: event.coOrganizers.some(co => co._id.toString() === userId)
    };

    res.json(eventObj);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'ইভেন্ট লোড করতে সমস্যা হয়েছে' });
  }
});

// RSVP to event
router.post('/:eventId/rsvp', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { response } = req.body; // 'going', 'interested', 'not_going'

    const validResponses = ['going', 'interested', 'not_going'];
    if (!validResponses.includes(response)) {
      return res.status(400).json({ message: 'অবৈধ RSVP রেসপন্স' });
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'ইভেন্ট পাওয়া যায়নি' });
    }

    const userId = req.user.userId;

    // Remove user from all attendance arrays first
    event.attendees.going = event.attendees.going.filter(a => a.user.toString() !== userId);
    event.attendees.interested = event.attendees.interested.filter(a => a.user.toString() !== userId);

    // Add user to appropriate array
    if (response === 'going') {
      // Check max attendees limit
      if (event.maxAttendees && event.attendees.going.length >= event.maxAttendees) {
        return res.status(400).json({ message: 'ইভেন্টে সর্বোচ্চ সংখ্যক অংশগ্রহণকারী পূর্ণ হয়ে গেছে' });
      }
      
      event.attendees.going.push({
        user: userId,
        respondedAt: new Date()
      });
    } else if (response === 'interested') {
      event.attendees.interested.push({
        user: userId,
        respondedAt: new Date()
      });
    }

    await event.save();

    // Send notification to organizer
    if (userId !== event.organizer.toString()) {
      const notification = new Notification({
        recipient: event.organizer,
        sender: userId,
        type: 'event_response',
        title: 'ইভেন্ট রেসপন্স',
        message: `${response === 'going' ? 'যোগ দেবেন' : 'আগ্রহী'} আপনার ইভেন্টে: ${event.title}`,
        relatedId: eventId,
        relatedModel: 'Event',
        metadata: {
          eventName: event.title,
          response: response
        }
      });
      await notification.save();
    }

    res.json({
      message: 'RSVP সফলভাবে আপডেট হয়েছে',
      response,
      attendeeCounts: {
        going: event.attendees.going.length,
        interested: event.attendees.interested.length
      }
    });
  } catch (error) {
    console.error('RSVP event error:', error);
    res.status(500).json({ message: 'RSVP করতে সমস্যা হয়েছে' });
  }
});

// Invite users to event
router.post('/:eventId/invite', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'ইউজার আইডি তালিকা প্রয়োজন' });
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'ইভেন্ট পাওয়া যায়নি' });
    }

    const userId = req.user.userId;

    // Check if user can invite (organizer or co-organizer)
    const canInvite = 
      event.organizer.toString() === userId ||
      event.coOrganizers.includes(userId);

    if (!canInvite) {
      return res.status(403).json({ message: 'আমন্ত্রণ জানানোর অনুমতি নেই' });
    }

    const newInvitations = [];

    for (const inviteeId of userIds) {
      // Check if user is already invited, going, or interested
      const alreadyInvited = 
        event.attendees.invited.some(a => a.user.toString() === inviteeId) ||
        event.attendees.going.some(a => a.user.toString() === inviteeId) ||
        event.attendees.interested.some(a => a.user.toString() === inviteeId);

      if (!alreadyInvited) {
        event.attendees.invited.push({
          user: inviteeId,
          invitedBy: userId,
          invitedAt: new Date()
        });
        newInvitations.push(inviteeId);

        // Send notification to invitee
        const notification = new Notification({
          recipient: inviteeId,
          sender: userId,
          type: 'event_invite',
          title: 'ইভেন্ট আমন্ত্রণ',
          message: `আপনাকে ইভেন্টে আমন্ত্রণ জানানো হয়েছে: ${event.title}`,
          relatedId: eventId,
          relatedModel: 'Event',
          metadata: {
            eventName: event.title
          }
        });
        await notification.save();
      }
    }

    await event.save();

    res.json({
      message: `${newInvitations.length} জনকে সফলভাবে আমন্ত্রণ জানানো হয়েছে`,
      newInvitations: newInvitations.length,
      totalInvited: event.attendees.invited.length
    });
  } catch (error) {
    console.error('Invite to event error:', error);
    res.status(500).json({ message: 'আমন্ত্রণ পাঠাতে সমস্যা হয়েছে' });
  }
});

// Add discussion comment
router.post('/:eventId/discussion', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'কমেন্ট টেক্সট প্রয়োজন' });
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'ইভেন্ট পাওয়া যায়নি' });
    }

    const comment = {
      author: req.user.userId,
      text: text.trim(),
      timestamp: new Date()
    };

    event.discussion.push(comment);
    await event.save();

    // Populate the new comment
    await event.populate('discussion.author', 'username fullName avatar');
    const newComment = event.discussion[event.discussion.length - 1];

    res.status(201).json({
      message: 'কমেন্ট যোগ করা হয়েছে',
      comment: newComment
    });
  } catch (error) {
    console.error('Add discussion comment error:', error);
    res.status(500).json({ message: 'কমেন্ট যোগ করতে সমস্যা হয়েছে' });
  }
});

// Update event
router.put('/:eventId', auth, upload.single('coverPhoto'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'ইভেন্ট পাওয়া যায়নি' });
    }

    const userId = req.user.userId;

    // Check if user can edit (organizer or co-organizer)
    const canEdit = 
      event.organizer.toString() === userId ||
      event.coOrganizers.includes(userId);

    if (!canEdit) {
      return res.status(403).json({ message: 'ইভেন্ট সম্পাদনা করার অনুমতি নেই' });
    }

    // Handle cover photo upload
    if (req.file) {
      // Delete old cover photo if exists
      if (event.coverPhoto) {
        const oldPhotoPath = path.join(__dirname, '..', event.coverPhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      updates.coverPhoto = `/uploads/events/${req.file.filename}`;
    }

    // Parse JSON fields
    ['location', 'ticketPrice', 'tags'].forEach(field => {
      if (updates[field] && typeof updates[field] === 'string') {
        try {
          updates[field] = JSON.parse(updates[field]);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    });

    // Update dates
    if (updates.startDate) {
      updates.startDate = new Date(updates.startDate);
    }
    if (updates.endDate) {
      updates.endDate = new Date(updates.endDate);
    }

    Object.assign(event, updates);
    await event.save();

    await event.populate('organizer', 'username fullName avatar');
    await event.populate('coOrganizers', 'username fullName avatar');

    res.json({
      message: 'ইভেন্ট সফলভাবে আপডেট হয়েছে',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'ইভেন্ট আপডেট করতে সমস্যা হয়েছে' });
  }
});

// Delete event
router.delete('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'ইভেন্ট পাওয়া যায়নি' });
    }

    // Only organizer can delete event
    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'ইভেন্ট মুছার অনুমতি নেই' });
    }

    // Delete cover photo if exists
    if (event.coverPhoto) {
      const photoPath = path.join(__dirname, '..', event.coverPhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    event.isActive = false;
    await event.save();

    // Notify all attendees about event cancellation
    const allAttendees = [
      ...event.attendees.going.map(a => a.user),
      ...event.attendees.interested.map(a => a.user),
      ...event.attendees.invited.map(a => a.user)
    ];

    const uniqueAttendees = [...new Set(allAttendees.map(id => id.toString()))];

    const notifications = uniqueAttendees.map(attendeeId => ({
      recipient: attendeeId,
      sender: req.user.userId,
      type: 'event_cancelled',
      title: 'ইভেন্ট বাতিল',
      message: `ইভেন্ট বাতিল হয়েছে: ${event.title}`,
      relatedId: eventId,
      relatedModel: 'Event',
      metadata: {
        eventName: event.title
      }
    }));

    await Notification.insertMany(notifications);

    res.json({ message: 'ইভেন্ট সফলভাবে বাতিল করা হয়েছে' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'ইভেন্ট বাতিল করতে সমস্যা হয়েছে' });
  }
});

// Get user's events
router.get('/user/my-events', auth, async (req, res) => {
  try {
    const { type = 'all' } = req.query; // 'organized', 'attending', 'interested', 'all'
    const userId = req.user.userId;

    let filter = { isActive: true };

    switch (type) {
      case 'organized':
        filter.$or = [
          { organizer: userId },
          { coOrganizers: userId }
        ];
        break;
      case 'attending':
        filter['attendees.going.user'] = userId;
        break;
      case 'interested':
        filter['attendees.interested.user'] = userId;
        break;
      default:
        filter.$or = [
          { organizer: userId },
          { coOrganizers: userId },
          { 'attendees.going.user': userId },
          { 'attendees.interested.user': userId },
          { 'attendees.invited.user': userId }
        ];
    }

    const events = await Event.find(filter)
      .populate('organizer', 'username fullName avatar')
      .populate('coOrganizers', 'username fullName avatar')
      .sort({ startDate: 1 });

    // Separate past and upcoming events
    const now = new Date();
    const upcomingEvents = events.filter(event => new Date(event.startDate) >= now);
    const pastEvents = events.filter(event => new Date(event.startDate) < now);

    res.json({
      upcoming: upcomingEvents,
      past: pastEvents,
      total: events.length
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({ message: 'আপনার ইভেন্ট লোড করতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
