import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Fab
} from '@mui/material';
import {
  Event,
  LocationOn,
  Schedule,
  People,
  Share,
  BookmarkBorder,
  Bookmark,
  Add,
  FilterList,
  Search
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialog, setEventDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    category: '',
    startDate: new Date(),
    endDate: new Date(),
    location: {
      name: '',
      address: '',
      isOnline: false,
      onlineLink: ''
    },
    eventType: 'public',
    maxAttendees: '',
    ticketPrice: {
      free: true,
      price: 0,
      currency: 'BDT'
    }
  });

  const categories = [
    { id: 'party', name: 'পার্টি', nameEn: 'Party' },
    { id: 'concert', name: 'কনসার্ট', nameEn: 'Concert' },
    { id: 'conference', name: 'কনফারেন্স', nameEn: 'Conference' },
    { id: 'workshop', name: 'ওয়ার্কশপ', nameEn: 'Workshop' },
    { id: 'sports', name: 'খেলাধুলা', nameEn: 'Sports' },
    { id: 'festival', name: 'উৎসব', nameEn: 'Festival' },
    { id: 'meetup', name: 'মিটআপ', nameEn: 'Meetup' },
    { id: 'other', name: 'অন্যান্য', nameEn: 'Other' }
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, categoryFilter, locationFilter, tabValue]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/events/feed');
      setEvents(response.data.events);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Tab filtering
    const now = new Date();
    if (tabValue === 1) {
      // Today's events
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.toDateString() === now.toDateString();
      });
    } else if (tabValue === 2) {
      // This week's events
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= now && eventDate <= weekFromNow;
      });
    } else if (tabValue === 3) {
      // My events
      filtered = filtered.filter(event => 
        event.userAttendance?.isGoing || 
        event.userAttendance?.isOrganizer ||
        event.userAttendance?.isInterested
      );
    }

    // Search filtering
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filtering
    if (categoryFilter) {
      filtered = filtered.filter(event => event.category === categoryFilter);
    }

    // Location filtering
    if (locationFilter) {
      filtered = filtered.filter(event =>
        event.location?.name?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        event.location?.address?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const handleEventClick = async (eventId) => {
    try {
      const response = await axios.get(`/api/events/${eventId}`);
      setSelectedEvent(response.data);
      setEventDialog(true);
    } catch (error) {
      console.error('Error loading event details:', error);
    }
  };

  const handleRSVP = async (eventId, response) => {
    try {
      await axios.post(`/api/events/${eventId}/rsvp`, { response });
      
      // Update local state
      setEvents(prevEvents =>
        prevEvents.map(event => {
          if (event._id === eventId) {
            const updatedAttendance = { ...event.userAttendance };
            updatedAttendance.isGoing = response === 'going';
            updatedAttendance.isInterested = response === 'interested';
            
            return {
              ...event,
              userAttendance: updatedAttendance,
              attendeeCounts: {
                ...event.attendeeCounts,
                going: response === 'going' ? 
                  event.attendeeCounts.going + 1 : 
                  Math.max(0, event.attendeeCounts.going - 1),
                interested: response === 'interested' ? 
                  event.attendeeCounts.interested + 1 : 
                  Math.max(0, event.attendeeCounts.interested - 1)
              }
            };
          }
          return event;
        })
      );

      // Update selected event if it's the same
      if (selectedEvent && selectedEvent._id === eventId) {
        setSelectedEvent(prev => ({
          ...prev,
          userAttendance: {
            ...prev.userAttendance,
            isGoing: response === 'going',
            isInterested: response === 'interested'
          }
        }));
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const formData = new FormData();
      
      Object.keys(newEvent).forEach(key => {
        if (typeof newEvent[key] === 'object' && newEvent[key] !== null) {
          formData.append(key, JSON.stringify(newEvent[key]));
        } else {
          formData.append(key, newEvent[key]);
        }
      });

      await axios.post('/api/events', formData);
      
      setCreateDialog(false);
      setNewEvent({
        title: '',
        description: '',
        category: '',
        startDate: new Date(),
        endDate: new Date(),
        location: {
          name: '',
          address: '',
          isOnline: false,
          onlineLink: ''
        },
        eventType: 'public',
        maxAttendees: '',
        ticketPrice: {
          free: true,
          price: 0,
          currency: 'BDT'
        }
      });
      
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  const renderEventCard = (event) => (
    <Card key={event._id} sx={{ mb: 2, cursor: 'pointer' }}>
      <CardMedia
        component="img"
        height="200"
        image={event.coverPhoto || '/default-event-cover.jpg'}
        alt={event.title}
        onClick={() => handleEventClick(event._id)}
      />
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
            {event.title}
          </Typography>
          <Chip
            label={getCategoryName(event.category)}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Schedule fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatDate(event.startDate)}
          </Typography>
        </Box>
        
        {event.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {event.location.isOnline ? 'অনলাইন ইভেন্ট' : event.location.name}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <People fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {event.attendeeCounts.going} জন যাবেন • {event.attendeeCounts.interested} জন আগ্রহী
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {event.description.length > 100 
            ? `${event.description.substring(0, 100)}...` 
            : event.description
          }
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Avatar src={event.organizer.avatar} sx={{ width: 24, height: 24 }} />
          <Typography variant="caption">
            {event.organizer.fullName}
          </Typography>
          
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            {!event.userAttendance?.isGoing && !event.userAttendance?.isInterested && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRSVP(event._id, 'going');
                  }}
                >
                  যাবো
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRSVP(event._id, 'interested');
                  }}
                >
                  আগ্রহী
                </Button>
              </>
            )}
            
            {event.userAttendance?.isGoing && (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRSVP(event._id, 'not_going');
                }}
              >
                যাচ্ছি
              </Button>
            )}
            
            {event.userAttendance?.isInterested && !event.userAttendance?.isGoing && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRSVP(event._id, 'not_going');
                }}
              >
                আগ্রহী
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            ইভেন্টস
          </Typography>
          <Fab
            color="primary"
            aria-label="create event"
            onClick={() => setCreateDialog(true)}
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
          >
            <Add />
          </Fab>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="ইভেন্ট খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>ক্যাটেগরি</InputLabel>
              <Select
                value={categoryFilter}
                label="ক্যাটেগরি"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">সব</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              size="small"
              placeholder="অবস্থান"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              sx={{ minWidth: 120 }}
            />
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          <Tab label="সব ইভেন্ট" />
          <Tab label="আজকের" />
          <Tab label="এই সপ্তাহে" />
          <Tab label="আমার ইভেন্ট" />
        </Tabs>

        {/* Events List */}
        <Box>
          {loading ? (
            <Typography>ইভেন্ট লোড হচ্ছে...</Typography>
          ) : filteredEvents.length === 0 ? (
            <Typography>কোন ইভেন্ট পাওয়া যায়নি</Typography>
          ) : (
            filteredEvents.map(renderEventCard)
          )}
        </Box>

        {/* Event Details Dialog */}
        <Dialog
          open={eventDialog}
          onClose={() => setEventDialog(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedEvent && (
            <>
              <DialogTitle>
                <Box>
                  <Typography variant="h5">{selectedEvent.title}</Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    {getCategoryName(selectedEvent.category)}
                  </Typography>
                </Box>
              </DialogTitle>
              
              <DialogContent>
                {selectedEvent.coverPhoto && (
                  <img
                    src={selectedEvent.coverPhoto}
                    alt={selectedEvent.title}
                    style={{ width: '100%', maxHeight: 300, objectFit: 'cover', marginBottom: 16 }}
                  />
                )}
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="body1" paragraph>
                      {selectedEvent.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Schedule sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="body2">
                          শুরু: {formatDate(selectedEvent.startDate)}
                        </Typography>
                        <Typography variant="body2">
                          শেষ: {formatDate(selectedEvent.endDate)}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {selectedEvent.location && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <LocationOn sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="body2">
                            {selectedEvent.location.isOnline ? 'অনলাইন ইভেন্ট' : selectedEvent.location.name}
                          </Typography>
                          {selectedEvent.location.address && (
                            <Typography variant="body2" color="text.secondary">
                              {selectedEvent.location.address}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <People sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        {selectedEvent.attendeeCounts?.going || 0} জন যাবেন • {selectedEvent.attendeeCounts?.interested || 0} জন আগ্রহী
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          আয়োজক
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={selectedEvent.organizer.avatar} sx={{ mr: 2 }} />
                          <Typography>{selectedEvent.organizer.fullName}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={() => setEventDialog(false)}>
                  বন্ধ করুন
                </Button>
                
                {!selectedEvent.userAttendance?.isGoing && !selectedEvent.userAttendance?.isInterested && (
                  <>
                    <Button
                      variant="contained"
                      onClick={() => {
                        handleRSVP(selectedEvent._id, 'going');
                        setEventDialog(false);
                      }}
                    >
                      যাবো
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        handleRSVP(selectedEvent._id, 'interested');
                        setEventDialog(false);
                      }}
                    >
                      আগ্রহী
                    </Button>
                  </>
                )}
                
                {selectedEvent.userAttendance?.isGoing && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                      handleRSVP(selectedEvent._id, 'not_going');
                      setEventDialog(false);
                    }}
                  >
                    যাবো না
                  </Button>
                )}
                
                {selectedEvent.userAttendance?.isInterested && !selectedEvent.userAttendance?.isGoing && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      handleRSVP(selectedEvent._id, 'not_going');
                      setEventDialog(false);
                    }}
                  >
                    আগ্রহ নেই
                  </Button>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Create Event Dialog */}
        <Dialog
          open={createDialog}
          onClose={() => setCreateDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>নতুন ইভেন্ট তৈরি করুন</DialogTitle>
          
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ইভেন্টের নাম"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="বিবরণ"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>ক্যাটেগরি</InputLabel>
                  <Select
                    value={newEvent.category}
                    label="ক্যাটেগরি"
                    onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>ইভেন্টের ধরন</InputLabel>
                  <Select
                    value={newEvent.eventType}
                    label="ইভেন্টের ধরন"
                    onChange={(e) => setNewEvent(prev => ({ ...prev, eventType: e.target.value }))}
                  >
                    <MenuItem value="public">পাবলিক</MenuItem>
                    <MenuItem value="friends">বন্ধুদের জন্য</MenuItem>
                    <MenuItem value="private">প্রাইভেট</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="শুরুর তারিখ ও সময়"
                  value={newEvent.startDate}
                  onChange={(date) => setNewEvent(prev => ({ ...prev, startDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="শেষের তারিখ ও সময়"
                  value={newEvent.endDate}
                  onChange={(date) => setNewEvent(prev => ({ ...prev, endDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="স্থানের নাম"
                  value={newEvent.location.name}
                  onChange={(e) => setNewEvent(prev => ({
                    ...prev,
                    location: { ...prev.location, name: e.target.value }
                  }))}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ঠিকানা"
                  value={newEvent.location.address}
                  onChange={(e) => setNewEvent(prev => ({
                    ...prev,
                    location: { ...prev.location, address: e.target.value }
                  }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)}>
              বাতিল
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateEvent}
              disabled={!newEvent.title || !newEvent.description || !newEvent.category}
            >
              ইভেন্ট তৈরি করুন
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Events;
