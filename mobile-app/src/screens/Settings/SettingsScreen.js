import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../../contexts/AuthContext';
import {usePushNotification} from '../../contexts/PushNotificationContext';

const SettingsScreen = ({navigation}) => {
  const {user, logout} = useAuth();
  const {notifications} = usePushNotification();
  
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    friendRequests: true,
    messages: true,
    postLikes: true,
    comments: true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    onlineStatus: true,
    readReceipts: true,
    locationSharing: false,
  });

  const handleLogout = () => {
    Alert.alert(
      'লগ আউট',
      'আপনি কি নিশ্চিত যে লগ আউট করতে চান?',
      '',
      [
        {
          text: 'না',
          style: 'cancel',
        },
        {
          text: 'হ্যাঁ',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const renderSectionHeader = (title) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderSettingItem = ({title, subtitle, value, onValueChange, type = 'switch'}) => (
    <View style={styles.settingItem}>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#e0e0e0', true: '#1877f2' }}
          thumbColor={value ? '#ffffff' : '#f4f3f4'}
        />
      )}
      {type === 'chevron' && (
        <Icon name="chevron-right" size={20} color="#ccc" />
      )}
    </View>
  );

  const renderMenuPressableItem = ({title, subtitle, icon, color = '#666', onPress}) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color={color} style={styles.menuIcon} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, {color}]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Icon name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>সেটিংস</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Settings */}
        {renderSectionHeader('একাউন্ট')}
        {renderMenuPressableItem({
          title: 'প্রোফাইল এডিট',
          subtitle: 'আপনার ব্যক্তিগত তথ্য আপডেট করুন',
          icon: 'edit',
          color: '#1877f2',
          onPress: () => {}
        })}
        
        {renderMenuPressableItem({
          title: 'পাসওয়ার্ড পরিবর্তন',
          subtitle: 'আপনার পাসওয়ার্ড পরিবর্তন করুন',
          icon: 'lock',
          onPress: () => {}
        })}

        {/* Notification Settings */}
        {renderSectionHeader('নোটিফিকেশন')}
        
        {renderSettingItem({
          title: 'পুশ নোটিফিকেশন',
          subtitle: 'সব নোটিফিকেশন সাধারণভাবে পেতে',
          value: notificationSettings.pushNotifications,
          onValueChange: (value) => setNotificationSettings(prev => ({...prev, pushNotifications: value}))
        })}
        
        {renderSettingItem({
          title: 'সাউন্ড',
          subtitle: 'নোটিফিকেশনের সাথে সাউন্ড',
          value: notificationSettings.soundEnabled,
          onValueChange: (value) => setNotificationSettings(prev => ({...prev, soundEnabled: value}))
        })}
        
        {renderSettingItem({
          title: 'ভাইব্রেশন',
          subtitle: 'নোটিফিকেশনের সাথে ভাইব্রেশন',
          value: notificationSettings.vibrationEnabled,
          onValueChange: (value) => setNotificationSettings(prev => ({...prev, vibrationEnabled: value}))
        })}

        {/* Privacy Settings */}
        {renderSectionHeader('প্রাইভেসি')}
        
        {renderSettingItem({
          title: 'অনলাইন স্ট্যাটাস',
          subtitle: 'অন্যদের কাছে অনলাইন স্ট্যাটাস দেখান',
          value: privacySettings.onlineStatus,
          onValueChange: (value) => setPrivacySettings(prev => ({...prev, onlineStatus: value}))
        })}
        
        {renderSettingItem({
          title: 'রিড রিসিট',
          subtitle: 'পড়ার নিশ্চিততা পাঠান',
          value: privacySettings.readReceipts,
          onValueChange: (value) => setPrivacySettings(prev => ({...prev, readReceipts: value}))
        })}
        
        {renderSettingItem({
          title: 'অবস্থান শেয়ার',
          subtitle: 'অন্যদের সাথে অবস্থান শেয়ার করা',
          value: privacySettings.locationSharing,
          onValueChange: (value) => setPrivacySettings(prev => ({...prev, locationSharing: value}))
        })}

        {/* App Settings */}
        {renderSectionHeader('অ্যাপ')}
        
        {renderMenuPressableItem({
          title: 'থিম',
          subtitle: 'আলো/অন্ধকার থিম বেছে নিন',
          icon: 'palette',
          onPress: () => {}
        })}
        
        {renderMenuPressableItem({
          title: 'ভাষা',
          subtitle: 'অ্যাপের ভাষা পরিবর্তন করুন',
          icon: 'language',
          onPress: () => {}
        })}
        
        {renderMenuPressableItem({
          title: 'সাহায্য ও সাপোর্ট',
          subtitle: 'সাহায্য পেতে যোগাযোগ করুন',
          icon: 'help',
          onPress: () => {}
        })}
        
        {renderMenuPressableItem({
          title: 'অ্যাপ সম্পর্কে',
          subtitle: 'ভার্সন, শর্তাবলী ও নীতি',
          icon: 'info',
          onPress: () => {}
        })}

        {/* Logout */}
        {renderSectionHeader('সিকিউরিটি')}
        
        {renderMenuPressableItem({
          title: 'লগ আউট',
          subtitle: 'আপনার একাউন্ট থেকে সাইন আউট করুন',
          icon: 'exit-to-app',
          color: '#e74c3c',
          onPress: handleLogout
        })}
        
        <View style={styles.bottomSpacing} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1877f2',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f5f5f5',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bottomSpacing: {
    height: 50,
  },
});

export default SettingsScreen;