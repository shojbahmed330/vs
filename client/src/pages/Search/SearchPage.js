import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  TextField,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Autocomplete,
  Divider,
  Grid,
  Paper,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search,
  Clear,
  History,
  TrendingUp,
  FilterList,
  ExpandMore,
  Person,
  Article,
  Tag,
  Group,
  Event,
  Business
} from '@mui/icons-material';
import { useSearch } from '../../contexts/SearchContext';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';

const SearchPage = () => {
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchHistory,
    searchFilters,
    setSearchFilters,
    performSearch,
    searchSuggestions,
    getTrendingHashtags,
    getPopularSearches,
    clearResults,
    clearSearchHistory,
    removeFromHistory
  } = useSearch();

  const [currentTab, setCurrentTab] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const debouncedGetSuggestions = useCallback(
    debounce(async (query) => {
      if (query.length > 1) {
        const suggestions = await searchSuggestions(query);
        setSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    [searchSuggestions]
  );

  useEffect(() => {
    loadTrendingData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      debouncedGetSuggestions(searchQuery);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, debouncedGetSuggestions]);

  const loadTrendingData = async () => {
    try {
      const [hashtags, popular] = await Promise.all([
        getTrendingHashtags(),
        getPopularSearches()
      ]);
      setTrendingHashtags(hashtags);
      setPopularSearches(popular);
    } catch (error) {
      console.error('Error loading trending data:', error);
    }
  };

  const handleSearch = (query = searchQuery) => {
    if (query.trim()) {
      performSearch(query, searchFilters);
      setShowSuggestions(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...searchFilters, [filterType]: value };
    setSearchFilters(newFilters);
    if (searchQuery) {
      performSearch(searchQuery, newFilters);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    const filterTypes = ['all', 'posts', 'users', 'hashtags', 'groups', 'events'];
    handleFilterChange('type', filterTypes[newValue]);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleHistoryClick = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleTrendingClick = (hashtag) => {
    const query = `#${hashtag}`;
    setSearchQuery(query);
    handleSearch(query);
  };

  const getTabCounts = () => {
    return {
      all: Object.values(searchResults).reduce((acc, curr) => acc + curr.length, 0),
      posts: searchResults.posts?.length || 0,
      users: searchResults.users?.length || 0,
      hashtags: searchResults.hashtags?.length || 0,
      groups: searchResults.groups?.length || 0,
      events: searchResults.events?.length || 0
    };
  };

  const renderResults = () => {
    const counts = getTabCounts();
    
    if (isSearching) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (!searchQuery) {
      return (
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            জনপ্রিয় অনুসন্ধান
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
            {popularSearches.map((search, index) => (
              <Chip
                key={index}
                label={search}
                onClick={() => handleHistoryClick(search)}
                icon={<TrendingUp />}
                variant="outlined"
              />
            ))}
          </Box>

          <Typography variant="h6" gutterBottom>
            ট্রেন্ডিং হ্যাশট্যাগ
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {trendingHashtags.map((hashtag, index) => (
              <Chip
                key={index}
                label={`#${hashtag}`}
                onClick={() => handleTrendingClick(hashtag)}
                icon={<Tag />}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      );
    }

    if (counts.all === 0) {
      return (
        <Box textAlign="center" p={4}>
          <Typography variant="h6" color="text.secondary">
            কোনো ফলাফল পাওয়া যায়নি
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            ভিন্ন কীওয়ার্ড দিয়ে চেষ্টা করুন
          </Typography>
        </Box>
      );
    }

    switch (currentTab) {
      case 1: // Posts
        return renderPosts();
      case 2: // Users
        return renderUsers();
      case 3: // Hashtags
        return renderHashtags();
      case 4: // Groups
        return renderGroups();
      case 5: // Events
        return renderEvents();
      default: // All
        return renderAllResults();
    }
  };

  const renderPosts = () => (
    <List>
      {searchResults.posts?.map((post) => (
        <React.Fragment key={post._id}>
          <ListItem button onClick={() => navigate(`/posts/${post._id}`)}>
            <ListItemAvatar>
              <Avatar src={post.author?.avatar}>
                {post.author?.firstName?.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`${post.author?.firstName} ${post.author?.lastName}`}
              secondary={post.content?.substring(0, 100) + '...'}
            />
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );

  const renderUsers = () => (
    <List>
      {searchResults.users?.map((user) => (
        <React.Fragment key={user._id}>
          <ListItem button onClick={() => navigate(`/profile/${user._id}`)}>
            <ListItemAvatar>
              <Avatar src={user.avatar}>
                {user.firstName?.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`${user.firstName} ${user.lastName}`}
              secondary={`@${user.username}`}
            />
            <ListItemSecondaryAction>
              <Button size="small" variant="outlined">
                প্রোফাইল দেখুন
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );

  const renderHashtags = () => (
    <List>
      {searchResults.hashtags?.map((hashtag, index) => (
        <React.Fragment key={index}>
          <ListItem button onClick={() => handleTrendingClick(hashtag.tag)}>
            <ListItemAvatar>
              <Avatar>
                <Tag />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`#${hashtag.tag}`}
              secondary={`${hashtag.count} পোস্ট`}
            />
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );

  const renderGroups = () => (
    <List>
      {searchResults.groups?.map((group) => (
        <React.Fragment key={group._id}>
          <ListItem button onClick={() => navigate(`/groups/${group._id}`)}>
            <ListItemAvatar>
              <Avatar src={group.avatar}>
                <Group />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={group.name}
              secondary={`${group.members?.length} সদস্য`}
            />
            <ListItemSecondaryAction>
              <Button size="small" variant="outlined">
                যোগ দিন
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );

  const renderEvents = () => (
    <List>
      {searchResults.events?.map((event) => (
        <React.Fragment key={event._id}>
          <ListItem button onClick={() => navigate(`/events/${event._id}`)}>
            <ListItemAvatar>
              <Avatar>
                <Event />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={event.title}
              secondary={new Date(event.date).toLocaleDateString('bn-BD')}
            />
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );

  const renderAllResults = () => {
    const counts = getTabCounts();
    
    return (
      <Box>
        {counts.users > 0 && (
          <Box mb={3}>
            <Typography variant="h6" mb={2}>ব্যবহারকারী</Typography>
            {renderUsers()}
          </Box>
        )}
        
        {counts.posts > 0 && (
          <Box mb={3}>
            <Typography variant="h6" mb={2}>পোস্ট</Typography>
            {renderPosts()}
          </Box>
        )}
        
        {counts.hashtags > 0 && (
          <Box mb={3}>
            <Typography variant="h6" mb={2}>হ্যাশট্যাগ</Typography>
            {renderHashtags()}
          </Box>
        )}
      </Box>
    );
  };

  const counts = getTabCounts();

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Search Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Autocomplete
            freeSolo
            options={suggestions}
            value={searchQuery}
            onInputChange={(event, newValue) => setSearchQuery(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="পোস্ট, ব্যবহারকারী, হ্যাশট্যাগ খুঁজুন..."
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchQuery && (
                        <IconButton onClick={() => {
                          setSearchQuery('');
                          clearResults();
                        }}>
                          <Clear />
                        </IconButton>
                      )}
                      <IconButton onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                        <FilterList />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} onClick={() => handleSuggestionClick(option)}>
                <Search sx={{ mr: 1, color: 'text.secondary' }} />
                {option}
              </li>
            )}
            open={showSuggestions}
            onClose={() => setShowSuggestions(false)}
          />

          {/* Advanced Filters */}
          <Accordion expanded={showAdvancedFilters}>
            <AccordionSummary>
              <Typography variant="body2">অ্যাডভান্স ফিল্টার</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>সময়সীমা</InputLabel>
                    <Select
                      value={searchFilters.timeRange}
                      onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                    >
                      <MenuItem value="all">সব সময়</MenuItem>
                      <MenuItem value="today">আজ</MenuItem>
                      <MenuItem value="week">এই সপ্তাহ</MenuItem>
                      <MenuItem value="month">এই মাস</MenuItem>
                      <MenuItem value="year">এই বছর</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>সাজানো</InputLabel>
                    <Select
                      value={searchFilters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    >
                      <MenuItem value="relevance">প্রাসঙ্গিকতা</MenuItem>
                      <MenuItem value="recent">সাম্প্রতিক</MenuItem>
                      <MenuItem value="popular">জনপ্রিয়</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Search History */}
      {!searchQuery && searchHistory.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">সাম্প্রতিক অনুসন্ধান</Typography>
              <Button size="small" onClick={clearSearchHistory}>
                সব মুছুন
              </Button>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {searchHistory.map((query, index) => (
                <Chip
                  key={index}
                  label={query}
                  onClick={() => handleHistoryClick(query)}
                  onDelete={() => removeFromHistory(query)}
                  icon={<History />}
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        {searchQuery && (
          <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable">
            <Tab label={`সব (${counts.all})`} />
            <Tab label={`পোস্ট (${counts.posts})`} />
            <Tab label={`ব্যবহারকারী (${counts.users})`} />
            <Tab label={`হ্যাশট্যাগ (${counts.hashtags})`} />
            <Tab label={`গ্রুপ (${counts.groups})`} />
            <Tab label={`ইভেন্ট (${counts.events})`} />
          </Tabs>
        )}
        
        {renderResults()}
      </Card>
    </Container>
  );
};

export default SearchPage;
