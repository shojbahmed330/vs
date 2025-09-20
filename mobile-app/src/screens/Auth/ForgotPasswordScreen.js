import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {authAPI} from '../../services/api';

const ForgotPasswordScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('সমস্যা', 'ইমেইল ঠিকানা দিন');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('সমস্যা', 'বৈধ ইমেইল ঠিকানা');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.forgotPassword(email.toLowerCase().trim());
      
      if (response.success) {
        setEmailSent(true);
        Alert.alert(
          'ইমেইল পাঠানো হয়েছে!',
          'পাসওয়ার্ড রিসেট করার লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে। ইমেইল চেক করুন।'
        );
      } else {
        Alert.alert('সমস্যা', response.message || 'ইমেইল পাঠাতে সমস্যা হয়েছে');
      }
    } catch (error) {
      Alert.alert('সমস্যা', 'ইমেইল পাঠাতে সমস্যা হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1877f2', '#42a5f5']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Icon name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>পাসওয়ার্ড ভুলে গেছেন?</Text>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Icon name="lock-outline" size={50} color="#ffffff" />
            </View>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {!emailSent ? (
              <>
                <Text style={styles.title}>পাসওয়ার্ড রিসেট</Text>
                <Text style={styles.description}>
                  আপনার ইমেইল ঠিকানা দিন। আমরা আপনাকে পাসওয়ার্ড রিসেট করার লিঙ্ক পাঠিয়ে দেব।
                </Text>

                <View style={styles.inputContainer}>
                  <Icon name="email" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="ইমেইল ঠিকানা"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.sendButton, isLoading && styles.disabledButton]} 
                  onPress={handleSendResetEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.sendButtonText}>
                    {isLoading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিঙ্ক পাঠান'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successIcon}>
                  <Icon name="check-circle" size={80} color="#4CAF50" />
                </View>
                <Text style={styles.successTitle}>ইমেইল পাঠানো হয়েছে!</Text>
                <Text style={styles.successDescription}>
                  পাসওয়ার্ড রিসেট করার জন্য ইমেইল চেক করুন এবং নির্দেশাবলী অনুসরণ করুন।
                </Text>
                
                <TouchableOpacity 
                  style={styles.backToLoginButton} 
                  onPress={goBack}
                >
                  <Text style={styles.backToLoginText}>লগইন পেজে ফিরে যান</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 30,
  },
  inputIcon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#1877f2',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 15,
  },
  successDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  backToLoginButton: {
    borderWidth: 1,
    borderColor: '#1877f2',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#1877f2',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;