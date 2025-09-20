import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LiveStreamScreen = ({navigation, route}) => {
  const { streamId } = route.params || {};
  
  return (
    <View style={styles.container}>
      <View style={styles.comingSoon}>
        <Icon name="videocam" size={80} color="#ccc" />
        <Text style={styles.comingSoonTitle}>লাইভ স্ট্রিম</Text>
        <Text style={styles.comingSoonText}>
          লাইভ স্ট্রিমিং ফিচার শীঘ্রই যুক্ত হবে
        </Text>
        {streamId && (
          <Text style={styles.streamId}>Stream ID: {streamId}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  streamId: {
    fontSize: 12,
    color: '#999',
  },
});

export default LiveStreamScreen;