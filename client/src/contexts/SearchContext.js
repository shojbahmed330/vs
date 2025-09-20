import React, { createContext, useContext, useState, useCallback } from 'react';
import Fuse from 'fuse.js';
import axios from 'axios';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    posts: [],
    users: [],
    hashtags: [],
    pages: [],
    groups: [],
    events: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchFilters, setSearchFilters] = useState({
    type: 'all', // all, posts, users, hashtags, pages, groups, events
    timeRange: 'all', // all, today, week, month, year
    sortBy: 'relevance' // relevance, recent, popular
  });

  // Fuse.js configuration for fuzzy search
  const fuseOptions = {
    includeScore: true,
    threshold: 0.3,
    keys: ['title', 'content', 'username', 'name', 'firstName', 'lastName', 'hashtag']
  };

  const addToHistory = useCallback((query) => {
    if (!query.trim() || searchHistory.includes(query)) return;
    
    const newHistory = [query, ...searchHistory.slice(0, 9)]; // Keep last 10 searches
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  }, [searchHistory]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  const removeFromHistory = useCallback((query) => {
    const newHistory = searchHistory.filter(item => item !== query);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  }, [searchHistory]);

  const performSearch = useCallback(async (query, filters = searchFilters) => {
    if (!query.trim()) {
      setSearchResults({
        posts: [],
        users: [],
        hashtags: [],
        pages: [],
        groups: [],
        events: []
      });
      return;
    }

    setIsSearching(true);
    addToHistory(query);

    try {
      const response = await axios.get('/api/search', {
        params: {
          q: query,
          type: filters.type,
          timeRange: filters.timeRange,
          sortBy: filters.sortBy
        }
      });

      const results = response.data;

      // Apply client-side fuzzy search if needed
      if (filters.sortBy === 'relevance') {
        Object.keys(results).forEach(category => {
          if (results[category] && results[category].length > 0) {
            const fuse = new Fuse(results[category], fuseOptions);
            const fuzzyResults = fuse.search(query);
            results[category] = fuzzyResults.map(result => result.item);
          }
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        posts: [],
        users: [],
        hashtags: [],
        pages: [],
        groups: [],
        events: []
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchFilters, addToHistory]);

  const searchSuggestions = useCallback(async (query) => {
    if (!query.trim()) return [];

    try {
      const response = await axios.get('/api/search/suggestions', {
        params: { q: query }
      });
      return response.data.suggestions || [];
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }, []);

  const getTrendingHashtags = useCallback(async () => {
    try {
      const response = await axios.get('/api/search/trending-hashtags');
      return response.data.hashtags || [];
    } catch (error) {
      console.error('Trending hashtags error:', error);
      return [];
    }
  }, []);

  const getPopularSearches = useCallback(async () => {
    try {
      const response = await axios.get('/api/search/popular');
      return response.data.searches || [];
    } catch (error) {
      console.error('Popular searches error:', error);
      return [];
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults({
      posts: [],
      users: [],
      hashtags: [],
      pages: [],
      groups: [],
      events: []
    });
    setSearchQuery('');
  }, []);

  const value = {
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
    removeFromHistory,
    addToHistory
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export default SearchContext;
