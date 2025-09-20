import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../contexts/AuthContext';
import {usePushNotification} from '../../contexts/PushNotificationContext';
import {useSocket} from '../../contexts/SocketContext';
import {postsAPI, liveStreamAPI} from '../../services/api';

const {width} = Dimensions.get('window');

const HomeScreen = ({navigation}) => {
  const {user} = useAuth();
  const {unreadCount} = usePushNotification();
  const {isConnected, onlineUsers} = useSocket();
  
  const [posts, setPosts] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadPosts(1),
      loadLiveStreams(),
    ]);
    setLoading(false);
  };

  const loadPosts = async (pageNum = 1) => {
    try {
      const response = await postsAPI.getFeed(pageNum, 10);
      if (response.success) {
        if (pageNum === 1) {
          setPosts(response.posts);
        } else {
          setPosts(prev => [...prev, ...response.posts]);
        }
        setHasMorePosts(response.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('সমস্যা', 'পোস্ট লোড করতে সমস্যা হয়েছে');
    }
  };

  const loadLiveStreams = async () => {
    try {
      const response = await liveStreamAPI.getActiveStreams();
      if (response.success) {
        setLiveStreams(response.streams);
      }
    } catch (error) {
      console.error('Error loading live streams:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  const loadMorePosts = () => {
    if (!loading && hasMorePosts) {
      loadPosts(page + 1);
    }
  };

  const handlePostLike = async (postId) => {
    try {
      const response = await postsAPI.likePost(postId);
      if (response.success) {
        setPosts(prev => 
          prev.map(post => 
            post._id === postId 
              ? {
                  ...post, 
                  likes: response.likes,
                  isLiked: response.isLiked
                }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#1877f2', '#42a5f5']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>সোশ্যাল মিডিয়া</Text>
            <Text style={styles.connectionStatus}>
              {isConnected ? 'অনলাইন' : 'অফলাইন'}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Search')}
            >
              <Icon name="search" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications" size={24} color="#ffffff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderCreatePost = () => (
    <View style={styles.createPostContainer}>
      <TouchableOpacity 
        style={styles.createPostButton}
        onPress={() => navigation.navigate('Profile', {screen: 'CreatePost'})}
      >
        <Image 
          source={{uri: user?.avatar || 'https://via.placeholder.com/40'}} 
          style={styles.userAvatar}
        />
        <Text style={styles.createPostText}>আপনার মনে কি আছে?</Text>
      </TouchableOpacity>
      
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postAction}>
          <Icon name="photo" size={20} color="#1877f2" />
          <Text style={styles.postActionText}>ফটো</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => navigation.navigate('LiveStream')}
        >
          <Icon name="videocam" size={20} color="#e74c3c" />
          <Text style={styles.postActionText}>লাইভ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLiveStreams = () => {
    if (liveStreams.length === 0) return null;
    
    return (
      <View style={styles.liveStreamsContainer}>
        <Text style={styles.sectionTitle}>লাইভ স্ট্রিম</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {liveStreams.map((stream) => (
            <TouchableOpacity 
              key={stream._id}
              style={styles.liveStreamCard}
              onPress={() => navigation.navigate('LiveStream', {streamId: stream._id})}
            >
              <Image 
                source={{uri: stream.thumbnail || 'https://via.placeholder.com/150'}} 
                style={styles.liveStreamThumbnail}
              />
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>লাইভ</Text>
              </View>
              <Text style={styles.liveStreamTitle}>{stream.title}</Text>
              <Text style={styles.liveStreamHost}>{stream.host.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPost = (post) => (
    <View key={post._id} style={styles.postContainer}>
      <View style={styles.postHeader}>
        <Image 
          source={{uri: post.author.avatar || 'https://via.placeholder.com/40'}} 
          style={styles.postAvatar}
        />
        <View style={styles.postInfo}>
          <Text style={styles.postAuthor}>{post.author.name}</Text>
          <Text style={styles.postTime}>{formatTime(post.createdAt)}</Text>
        </View>
        <TouchableOpacity style={styles.postMenu}>
          <Icon name="more-vert" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {post.content && (
        <Text style={styles.postContent}>{post.content}</Text>
      )}
      
      {post.media && post.media.length > 0 && (
        <Image 
          source={{uri: post.media[0]}} 
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => handlePostLike(post._id)}
        >
          <Icon 
            name={post.isLiked ? "favorite" : "favorite-border"} 
            size={20} 
            color={post.isLiked ? "#e74c3c" : "#666"} 
          />
          <Text style={styles.postActionText}>{post.likes?.length || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => navigation.navigate('PostDetail', {postId: post._id})}
        >
          <Icon name="comment" size={20} color="#666" />
          <Text style={styles.postActionText}>{post.comments?.length || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <Icon name="share" size={20} color="#666" />
          <Text style={styles.postActionText}>শেয়ার</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const formatTime = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - postTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'এখনে';
    if (diffInMinutes < 60) return `${diffInMinutes}ম আগে`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}ঘ আগে`;
    return `${Math.floor(diffInMinutes / 1440)}দ আগে`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877f2" />
        <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          const paddingToBottom = 20;
          
          if (layoutMeasurement.height + contentOffset.y >= 
              contentSize.height - paddingToBottom) {
            loadMorePosts();
          }
        }}
        scrollEventThrottle={400}
      >
        {renderCreatePost()}
        {renderLiveStreams()}
        
        <View style={styles.postsContainer}>
          <Text style={styles.sectionTitle}>নিউজ ফিড</Text>
          {posts.map(renderPost)}
          
          {hasMorePosts && (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color="#1877f2" />
              <Text style={styles.loadMoreText}>আরো পোস্ট লোড হচ্ছে...</Text>
            </View>
          )}
        </View>
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  connectionStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff3333',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  createPostContainer: {
    backgroundColor: '#ffffff',
    marginVertical: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  createPostText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  postActionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  liveStreamsContainer: {
    backgroundColor: '#ffffff',
    marginVertical: 5,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  liveStreamCard: {
    width: 150,
    marginLeft: 15,
    position: 'relative',
  },
  liveStreamThumbnail: {
    width: 150,
    height: 100,
    borderRadius: 10,
    marginBottom: 5,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveStreamTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  liveStreamHost: {
    fontSize: 12,
    color: '#666',
  },
  postsContainer: {
    backgroundColor: '#ffffff',
    marginVertical: 5,
    paddingTop: 15,
  },
  postContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  postMenu: {
    padding: 5,
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen;