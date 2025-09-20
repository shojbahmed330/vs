import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {userAPI} from '../../services/api';

const SearchScreen = ({navigation}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await userAPI.searchUsers(query.trim());
      if (response.success) {
        setResults(response.users || []);
      } else {
        setResults([]);
      }
      setSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="বন্ধু, পেজ বা গ্রুপ খুঁজুন..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1877f2" />
            <Text style={styles.loadingText}>খুঁজছি...</Text>
          </View>
        ) : searched ? (
          results.length > 0 ? (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>খোঁজের ফলাফল ({results.length})</Text>
              {/* Results will be rendered here */}
              <View style={styles.comingSoon}>
                <Icon name="search" size={60} color="#ccc" />
                <Text style={styles.comingSoonText}>
                  খোঁজ ফিচার শীঘ্রই যুক্ত হবে
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noResultsContainer}>
              <Icon name="search-off" size={60} color="#ccc" />
              <Text style={styles.noResultsTitle}>কিছু পাওয়া যায়নি</Text>
              <Text style={styles.noResultsText}>
                '"{query}" এর জন্য কোনো ফলাফল পাওয়া যায়নি
              </Text>
            </View>
          )
        ) : (
          <View style={styles.defaultContainer}>
            {/* Quick Search Options */}
            <View style={styles.quickSearchSection}>
              <Text style={styles.sectionTitle}>জনপ্রিয় খোঁজ</Text>
              
              <TouchableOpacity style={styles.quickSearchItem}>
                <Icon name="people" size={24} color="#1877f2" />
                <Text style={styles.quickSearchText}>বন্ধুদের খুঁজুন</Text>
                <Icon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickSearchItem}>
                <Icon name="group" size={24} color="#4CAF50" />
                <Text style={styles.quickSearchText}>গ্রুপ খুঁজুন</Text>
                <Icon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickSearchItem}>
                <Icon name="business" size={24} color="#FF9800" />
                <Text style={styles.quickSearchText}>পেজ খুঁজুন</Text>
                <Icon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* Recent Searches */}
            <View style={styles.recentSearchSection}>
              <Text style={styles.sectionTitle}>সাম্প্রতিক খোঁজ</Text>
              <View style={styles.emptyRecent}>
                <Icon name="history" size={40} color="#ccc" />
                <Text style={styles.emptyRecentText}>কোনো সাম্প্রতিক খোঁজ নেই</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  defaultContainer: {
    padding: 20,
  },
  quickSearchSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  quickSearchText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  recentSearchSection: {
    marginBottom: 20,
  },
  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRecentText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
});

export default SearchScreen;