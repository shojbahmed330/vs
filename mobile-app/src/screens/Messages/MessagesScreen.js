import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MessagesScreen = ({navigation}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>মেসেজ</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="edit" size={24} color="#1877f2" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.comingSoon}>
        <Icon name="message" size={80} color="#ccc" />
        <Text style={styles.comingSoonTitle}>শীঘ্রই আসছে!</Text>
        <Text style={styles.comingSoonText}>
          মেসেজিং ফিচার শীঘ্রই যুক্ত হবে
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButton: {
    padding: 5,
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

export default MessagesScreen;