import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {View, Text, Badge} from 'react-native';
import {usePushNotification} from '../contexts/PushNotificationContext';

// Screens
import HomeScreen from '../screens/Home/HomeScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import MessagesScreen from '../screens/Messages/MessagesScreen';
import ChatScreen from '../screens/Messages/ChatScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import FriendsScreen from '../screens/Friends/FriendsScreen';
import LiveStreamScreen from '../screens/LiveStream/LiveStreamScreen';
import CreatePostScreen from '../screens/Posts/CreatePostScreen';
import PostDetailScreen from '../screens/Posts/PostDetailScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import UserProfileScreen from '../screens/Profile/UserProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="LiveStream" component={LiveStreamScreen} />
  </Stack.Navigator>
);

// Messages Stack
const MessagesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MessagesMain" component={MessagesScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} />
  </Stack.Navigator>
);

// Search Stack
const SearchStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SearchMain" component={SearchScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
  </Stack.Navigator>
);

// Notifications Stack
const NotificationsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NotificationsMain" component={NotificationsScreen} />
    <Stack.Screen name="Friends" component={FriendsScreen} />
  </Stack.Navigator>
);

const TabIcon = ({ focused, color, size, name, badgeCount }) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size} color={color} />
      {badgeCount > 0 && (
        <View
          style={{
            position: 'absolute',
            right: -8,
            top: -4,
            backgroundColor: '#ff3333',
            borderRadius: 10,
            minWidth: 16,
            height: 16,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const MainNavigator = () => {
  const { unreadCount } = usePushNotification();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1877f2',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e5e7',
          borderTopWidth: 0.5,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'হোম',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              name="home"
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          tabBarLabel: 'খুঁজুন',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              name="search"
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarLabel: 'মেসেজ',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              name="message"
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="Notifications"
        component={NotificationsStack}
        options={{
          tabBarLabel: 'নোটিফিকেশন',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              name="notifications"
              badgeCount={unreadCount}
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'প্রোফাইল',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              name="person"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;