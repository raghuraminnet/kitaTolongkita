import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { authApi, setAccessToken, getAccessToken, API_BASE } from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export const SignUpScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const processImage = async (uri: string): Promise<string> => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 200, height: 200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  };

  const pickAvatar = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera access is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets?.[0]) {
              const processed = await processImage(result.assets[0].uri);
              setAvatarUri(processed);
            }
          } else if (buttonIndex === 2) {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Gallery access is required to select photos.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled && result.assets?.[0]) {
              const processed = await processImage(result.assets[0].uri);
              setAvatarUri(processed);
            }
          }
        }
      );
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery access is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]) {
        const processed = await processImage(result.assets[0].uri);
        setAvatarUri(processed);
      }
    }
  };

  const uploadAvatar = async (userId: string) => {
    if (!avatarUri) return;
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: avatarUri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);
      const token = await getAccessToken();
      await fetch(`${API_BASE}/uploads/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch {
      // Avatar upload is non-critical, don't block user
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter your password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.emailSignup({ email, fullName: name, password });
      await setAccessToken(res.accessToken);
      if (avatarUri) {
        await uploadAvatar(res.user?.id ?? '');
      }
      navigation.replace('ProfileSetup');
    } catch (err: any) {
      Alert.alert('Sign up failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>Join KitaTolongKita 🤝</Text>
          <Text style={styles.brandSubtitle}>
            Create your account to start group buying with your community
          </Text>
        </View>

        {/* Avatar Upload */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderIcon}>📷</Text>
              </View>
            )}
            <View style={styles.avatarCameraBadge}>
              <Text style={styles.avatarCameraIcon}>📸</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to add profile photo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            prefix="👤"
            containerStyle={styles.input}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            prefix="📧"
            containerStyle={styles.input}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            prefix="🔒"
            containerStyle={styles.input}
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            prefix="🔒"
            containerStyle={styles.input}
          />
          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            fullWidth
          />
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By creating an account, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: { fontSize: 24, color: colors['on-surface'] },
  headerTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700',
    color: colors['on-background'],
  },
  branding: { marginBottom: spacing.lg },
  brandTitle: {
    fontFamily: 'NunitoSans_800ExtraBold', fontSize: 28, fontWeight: '800',
    color: colors['on-background'], marginBottom: spacing.sm, lineHeight: 36,
  },
  brandSubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: colors['on-surface-variant'],
    lineHeight: 22,
  },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarWrapper: {
    width: 88, height: 88, borderRadius: 44,
    position: 'relative',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors['surface-container'],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors['outline-variant'],
  },
  avatarPlaceholderIcon: { fontSize: 28 },
  avatarCameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors['primary-container'],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  avatarCameraIcon: { fontSize: 12 },
  avatarHint: {
    ...typography['body-sm'], color: colors['on-surface-variant'],
    marginTop: spacing.xs,
  },
  form: { marginBottom: spacing.xl },
  input: { marginBottom: spacing.md },
  terms: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'],
    textAlign: 'center', lineHeight: 18,
  },
  termsLink: { color: colors['primary-container'], fontWeight: '600' },
});
