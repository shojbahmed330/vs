import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import {useAuth} from '../../contexts/AuthContext';
import {postsAPI} from '../../services/api';

const CreatePostScreen = ({navigation}) => {
  const {user} = useAuth();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPosting, setIsPosting] = useState(false);

  const handleImagePicker = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      selectionLimit: 5,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }
      
      if (response.assets) {
        setSelectedImages(response.assets);
      }
    });
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      Alert.alert('সমস্যা', 'কিছু লিখুন অথবা ফটো যুক্ত করুন');
      return;
    }

    setIsPosting(true);
    try {
      const postData = {
        content: content.trim(),
        media: selectedImages
      };

      const response = await postsAPI.createPost(postData);
      
      if (response.success) {
        Alert.alert('সফল!', 'আপনার পোস্ট পাবলিশ হয়েছে', [
          {
            text: 'ঠিক আছে',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        Alert.alert('সমস্যা', response.message || 'পোস্ট করতে সমস্যা হয়েছে');
      }
    } catch (error) {
      console.error('Create post error:', error);
      Alert.alert('সমস্যা', 'পোস্ট করতে সমস্যা হয়েছে');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>বাতিল</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>নতুন পোস্ট</Text>
        
        <TouchableOpacity 
          style={[styles.headerButton, styles.postButton, isPosting && styles.disabledButton]}
          onPress={handlePost}
          disabled={isPosting}
        >
          <Text style={styles.postText}>
            {isPosting ? 'পোস্ট হচ্ছে...' : 'পোস্ট'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Image
            source={{uri: user?.avatar || 'https://via.placeholder.com/40'}}
            style={styles.userAvatar}
          />
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>

        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          placeholder="আপনার মনে কি আছে?"
          placeholderTextColor="#999"
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={1000}
          autoFocus
        />

        {/* Character Count */}
        <Text style={styles.characterCount}>{content.length}/1000</Text>

        {/* Selected Images */}
        {selectedImages.length > 0 && (
          <View style={styles.imagesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{uri: image.uri}} style={styles.selectedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Icon name="close" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleImagePicker}>
            <Icon name="photo" size={24} color="#4CAF50" />
            <Text style={styles.actionButtonText}>ফটো/ভিডিও</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="location-on" size={24} color="#e74c3c" />
            <Text style={styles.actionButtonText}>অবস্থান</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="emoji-emotions" size={24} color="#FF9800" />
            <Text style={styles.actionButtonText}>ইমোজি</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  postButton: {
    backgroundColor: '#1877f2',
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  postText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  textInput: {
    fontSize: 18,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 10,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 20,
  },
  imagesContainer: {
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontWeight: '500',
  },
});

export default CreatePostScreen;