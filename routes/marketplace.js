const express = require('express');
const router = express.Router();
const Marketplace = require('../models/Marketplace');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for marketplace uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/marketplace/';
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

// Create marketplace listing
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      condition,
      price,
      location,
      specifications,
      tags
    } = req.body;

    const listingData = {
      title,
      description,
      seller: req.user.userId,
      category,
      subCategory,
      condition,
      price: JSON.parse(price)
    };

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      listingData.images = req.files.map(file => ({
        url: `/uploads/marketplace/${file.filename}`,
        caption: ''
      }));
    }

    // Parse JSON fields
    if (location) {
      listingData.location = JSON.parse(location);
    }
    if (specifications) {
      listingData.specifications = JSON.parse(specifications);
    }
    if (tags) {
      listingData.tags = JSON.parse(tags);
    }

    const listing = new Marketplace(listingData);
    await listing.save();

    await listing.populate('seller', 'username fullName avatar');

    res.status(201).json({
      message: 'মার্কেটপ্লেসে আইটেম সফলভাবে যোগ করা হয়েছে',
      listing
    });
  } catch (error) {
    console.error('Create marketplace listing error:', error);
    res.status(500).json({ message: 'আইটেম যোগ করতে সমস্যা হয়েছে' });
  }
});

// Get marketplace listings
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, location, minPrice, maxPrice, condition, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {
      isActive: true,
      availability: { $in: ['available', 'pending'] }
    };

    if (category) {
      filter.category = category;
    }

    if (location) {
      filter['location.city'] = { $regex: location, $options: 'i' };
    }

    if (condition) {
      filter.condition = condition;
    }

    if (minPrice || maxPrice) {
      filter['price.amount'] = {};
      if (minPrice) filter['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['price.amount'].$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const listings = await Marketplace.find(filter)
      .populate('seller', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Marketplace.countDocuments(filter);

    res.json({
      listings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalListings: total,
        hasNext: skip + listings.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get marketplace listings error:', error);
    res.status(500).json({ message: 'মার্কেটপ্লেস লোড করতে সমস্যা হয়েছে' });
  }
});

// Get single listing
router.get('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Marketplace.findById(listingId)
      .populate('seller', 'username fullName avatar location')
      .populate('interestedBuyers.buyer', 'username fullName avatar');

    if (!listing) {
      return res.status(404).json({ message: 'আইটেম পাওয়া যায়নি' });
    }

    // Increment view count
    listing.views += 1;
    await listing.save();

    res.json(listing);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ message: 'আইটেম লোড করতে সমস্যা হয়েছে' });
  }
});

// Express interest in item
router.post('/:listingId/interest', auth, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { message, offeredPrice } = req.body;

    const listing = await Marketplace.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ message: 'আইটেম পাওয়া যায়নি' });
    }

    if (listing.seller.toString() === req.user.userId) {
      return res.status(400).json({ message: 'আপনি নিজের আইটেমে আগ্রহ প্রকাশ করতে পারবেন না' });
    }

    // Check if user already expressed interest
    const existingInterest = listing.interestedBuyers.find(buyer => 
      buyer.buyer.toString() === req.user.userId
    );

    if (existingInterest) {
      return res.status(400).json({ message: 'আপনি ইতিমধ্যে আগ্রহ প্রকাশ করেছেন' });
    }

    const interest = {
      buyer: req.user.userId,
      message: message || '',
      offeredPrice: offeredPrice || listing.price.amount,
      timestamp: new Date(),
      status: 'pending'
    };

    listing.interestedBuyers.push(interest);
    await listing.save();

    // Send notification to seller
    const notification = new Notification({
      recipient: listing.seller,
      sender: req.user.userId,
      type: 'marketplace_interest',
      title: 'নতুন ক্রেতার আগ্রহ',
      message: `আপনার "${listing.title}" আইটেমে কেউ আগ্রহ প্রকাশ করেছে`,
      relatedId: listingId,
      relatedModel: 'Marketplace',
      metadata: {
        itemTitle: listing.title,
        offeredPrice: offeredPrice
      }
    });
    await notification.save();

    res.json({
      message: 'আগ্রহ সফলভাবে প্রকাশ করা হয়েছে',
      interest
    });
  } catch (error) {
    console.error('Express interest error:', error);
    res.status(500).json({ message: 'আগ্রহ প্রকাশ করতে সমস্যা হয়েছে' });
  }
});

// Respond to buyer interest
router.post('/:listingId/interest/:interestId/respond', auth, async (req, res) => {
  try {
    const { listingId, interestId } = req.params;
    const { response } = req.body; // 'accepted' or 'rejected'

    const listing = await Marketplace.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ message: 'আইটেম পাওয়া যায়নি' });
    }

    if (listing.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই আইটেমের মালিক শুধুমাত্র আপনি নন' });
    }

    const interest = listing.interestedBuyers.id(interestId);
    if (!interest) {
      return res.status(404).json({ message: 'আগ্রহ পাওয়া যায়নি' });
    }

    interest.status = response;
    await listing.save();

    // Send notification to buyer
    const notification = new Notification({
      recipient: interest.buyer,
      sender: req.user.userId,
      type: 'marketplace_response',
      title: response === 'accepted' ? 'আগ্রহ গৃহীত' : 'আগ্রহ প্রত্যাখ্যাত',
      message: `"${listing.title}" এর জন্য আপনার আগ্রহ ${response === 'accepted' ? 'গৃহীত' : 'প্রত্যাখ্যাত'} হয়েছে`,
      relatedId: listingId,
      relatedModel: 'Marketplace',
      metadata: {
        itemTitle: listing.title,
        response: response
      }
    });
    await notification.save();

    res.json({
      message: `আগ্রহের জবাব ${response === 'accepted' ? 'গৃহীত' : 'প্রত্যাখ্যাত'} হিসেবে পাঠানো হয়েছে`,
      interest
    });
  } catch (error) {
    console.error('Respond to interest error:', error);
    res.status(500).json({ message: 'জবাব পাঠাতে সমস্যা হয়েছে' });
  }
});

// Update listing
router.put('/:listingId', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { listingId } = req.params;
    const updates = req.body;

    const listing = await Marketplace.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ message: 'আইটেম পাওয়া যায়নি' });
    }

    if (listing.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই আইটেম সম্পাদনা করার অনুমতি নেই' });
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/marketplace/${file.filename}`,
        caption: ''
      }));
      
      // Keep existing images and add new ones
      updates.images = [...(listing.images || []), ...newImages];
    }

    // Parse JSON fields
    ['price', 'location', 'specifications', 'tags'].forEach(field => {
      if (updates[field] && typeof updates[field] === 'string') {
        try {
          updates[field] = JSON.parse(updates[field]);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    });

    Object.assign(listing, updates);
    await listing.save();

    await listing.populate('seller', 'username fullName avatar');

    res.json({
      message: 'আইটেম সফলভাবে আপডেট হয়েছে',
      listing
    });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ message: 'আইটেম আপডেট করতে সমস্যা হয়েছে' });
  }
});

// Mark as sold
router.post('/:listingId/sold', auth, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { buyerId } = req.body;

    const listing = await Marketplace.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ message: 'আইটেম পাওয়া যায়নি' });
    }

    if (listing.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই আইটেম বিক্রি করার অনুমতি নেই' });
    }

    listing.availability = 'sold';
    await listing.save();

    // Send notification to buyer if specified
    if (buyerId) {
      const notification = new Notification({
        recipient: buyerId,
        sender: req.user.userId,
        type: 'marketplace_sold',
        title: 'আইটেম বিক্রি হয়েছে',
        message: `"${listing.title}" সফলভাবে বিক্রি হয়েছে`,
        relatedId: listingId,
        relatedModel: 'Marketplace',
        metadata: {
          itemTitle: listing.title
        }
      });
      await notification.save();
    }

    res.json({
      message: 'আইটেম বিক্রি হিসেবে চিহ্নিত করা হয়েছে',
      listing
    });
  } catch (error) {
    console.error('Mark as sold error:', error);
    res.status(500).json({ message: 'বিক্রি চিহ্নিত করতে সমস্যা হয়েছে' });
  }
});

// Delete listing
router.delete('/:listingId', auth, async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Marketplace.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ message: 'আইটেম পাওয়া যায়নি' });
    }

    if (listing.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'এই আইটেম মুছার অনুমতি নেই' });
    }

    // Delete images
    if (listing.images && listing.images.length > 0) {
      listing.images.forEach(image => {
        const imagePath = path.join(__dirname, '..', image.url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    listing.isActive = false;
    await listing.save();

    res.json({ message: 'আইটেম সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ message: 'আইটেম মুছতে সমস্যা হয়েছে' });
  }
});

// Get user's listings
router.get('/user/my-listings', auth, async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    let filter = { seller: req.user.userId, isActive: true };

    if (status !== 'all') {
      filter.availability = status;
    }

    const listings = await Marketplace.find(filter)
      .populate('interestedBuyers.buyer', 'username fullName avatar')
      .sort({ createdAt: -1 });

    // Group by availability status
    const groupedListings = {
      available: listings.filter(l => l.availability === 'available'),
      pending: listings.filter(l => l.availability === 'pending'),
      sold: listings.filter(l => l.availability === 'sold')
    };

    res.json({
      listings: status === 'all' ? groupedListings : listings,
      total: listings.length
    });
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({ message: 'আপনার আইটেম লোড করতে সমস্যা হয়েছে' });
  }
});

// Get marketplace categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { 
        id: 'vehicles', 
        name: 'যানবাহন', 
        nameEn: 'Vehicles',
        subCategories: ['গাড়ি', 'মোটরসাইকেল', 'সাইকেল', 'অন্যান্য']
      },
      { 
        id: 'electronics', 
        name: 'ইলেকট্রনিক্স', 
        nameEn: 'Electronics',
        subCategories: ['মোবাইল', 'ল্যাপটপ', 'টিভি', 'ক্যামেরা', 'অন্যান্য']
      },
      { 
        id: 'clothing', 
        name: 'পোশাক', 
        nameEn: 'Clothing',
        subCategories: ['পুরুষ', 'মহিলা', 'শিশু', 'জুতা', 'অন্যান্য']
      },
      { 
        id: 'home_garden', 
        name: 'ঘর ও বাগান', 
        nameEn: 'Home & Garden',
        subCategories: ['আসবাবপত্র', 'রান্নাঘর', 'বাগান', 'অন্যান্য']
      },
      { 
        id: 'sports', 
        name: 'খেলাধুলা', 
        nameEn: 'Sports',
        subCategories: ['ফুটবল', 'ক্রিকেট', 'ব্যাডমিন্টন', 'অন্যান্য']
      },
      { 
        id: 'books', 
        name: 'বই', 
        nameEn: 'Books',
        subCategories: ['পাঠ্যবই', 'উপন্যাস', 'ধর্মীয়', 'অন্যান্য']
      }
    ];

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'ক্যাটেগরি লোড করতে সমস্যা হয়েছে' });
  }
});

module.exports = router;
