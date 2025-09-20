import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {usePushNotification} from '../../contexts/PushNotificationContext';
import {notificationAPI} from '../../services/api';

const NotificationsScreen = ({navigation}) => {
  const {notifications, unreadCount, getNotifications, markNotificationAsRead} = usePushNotification();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    await getNotifications();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
        navigation.navigate('Friends');
        break;
      case 'message':
        navigation.navigate('Messages');
        break;
      case 'post_like':
      case 'post_comment':
        navigation.navigate('Home', {
          screen: 'PostDetail',
          params: {postId: notification.data?.postId}
        });
        break;
      case 'live_stream':
        navigation.navigate('Home', {
          screen: 'LiveStream',
          params: {streamId: notification.data?.streamId}
        });
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return 'person-add';
      case 'friend_accept':
        return 'check-circle';
      case 'message':
        return 'message';
      case 'post_like':
        return 'favorite';
      case 'post_comment':
        return 'comment';
      case 'live_stream':
        return 'videocam';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'friend_request':
        return '#1877f2';
      case 'friend_accept':
        return '#4CAF50';
      case 'message':
        return '#2196F3';
      case 'post_like':
        return '#e74c3c';
      case 'post_comment':
        return '#9C27B0';
      case 'live_stream':
        return '#FF5722';
      default:
        return '#666';
    }
  };

  const renderNotification = ({item}) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.iconContainer, {backgroundColor: getNotificationColor(item.type)}]}>
        <Icon
          name={getNotificationIcon(item.type)}
          size={20}
          color="#ffffff"
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.timeAgo}</Text>
      </View>
      
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>নোটিফিকেশন</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>নোটিফিকেশন</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
      
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-none" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>কোনো নোটিফিকেশন নেই</Text>
          <Text style={styles.emptyText}>
            আপনার জন্য নতুন নোটিফিকেশন এলে এখানে দেখানো হবে
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#ff3333',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1877f2',
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default NotificationsScreen;