import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ChatScreen = ({navigation}) => {
  return (
    <View style={styles.container}>
      <View style={styles.comingSoon}>
        <Icon name="chat" size={80} color="#ccc" />
        <Text style={styles.comingSoonTitle}>চ্যাট</Text>
        <Text style={styles.comingSoonText}>
          চ্যাট ফিচার শীঘ্রই যুক্ত হবে
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default ChatScreen;