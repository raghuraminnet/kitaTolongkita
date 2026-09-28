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
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, shadows, DISPLAY_FONT, BODY_FONT } from '../../theme';
import { authApi, setAccessToken, getAccessToken, API_BASE } from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export const SignUpScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
      console.error('Sign up error:', err);
      Alert.alert('Sign up failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: spacing.md,
      paddingTop: Math.max(insets.top, spacing.md),
      paddingBottom: Math.max(insets.bottom, spacing.xl),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? colors['surface-container'] : colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      ...shadows.card,
    },
    backBtnText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors['on-surface'],
      marginLeft: -2,
    },
    headerTitle: {
      fontFamily: DISPLAY_FONT,
      fontSize: 17,
      fontWeight: '700',
      color: colors['on-background'],
    },
    branding: {
      alignItems: 'center',
      marginBottom: spacing.lg,
      paddingTop: spacing.xs,
    },
    brandTitle: {
      fontFamily: DISPLAY_FONT,
      fontSize: 26,
      fontWeight: '800',
      color: colors['on-background'],
      marginBottom: 6,
      textAlign: 'center',
    },
    brandSubtitle: {
      fontFamily: BODY_FONT,
      fontSize: 14,
      color: colors['on-surface-variant'],
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: spacing.sm,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    avatarWrapper: {
      width: 92,
      height: 92,
      borderRadius: 46,
      position: 'relative',
    },
    avatarImage: {
      width: 92,
      height: 92,
      borderRadius: 46,
    },
    avatarPlaceholder: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: isDark ? colors['surface-container'] : colors['primary-subtle'],
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors['primary-container'],
    },
    avatarPlaceholderIcon: { fontSize: 32 },
    avatarCameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors['primary-container'],
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
      ...shadows.card,
    },
    avatarCameraIcon: { fontSize: 13 },
    avatarHint: {
      fontFamily: BODY_FONT,
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.primary,
      marginTop: spacing.xs,
    },
    card: {
      backgroundColor: isDark ? colors['surface-container'] : colors.white,
      borderRadius: borderRadius.xl,
      padding: 22,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      ...shadows.card,
    },
    input: { marginBottom: spacing.md },
    terms: {
      fontFamily: BODY_FONT,
      fontSize: 12,
      color: colors['on-surface-variant'],
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: spacing.sm,
    },
    termsLink: { color: colors.primary, fontWeight: '600' },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    loginText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      color: colors['on-surface-variant'],
    },
    loginLink: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
      color: colors['primary-container'],
      fontWeight: '600',
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Create Account</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Branding */}
        <View style={s.branding}>
          <Text style={s.brandTitle}>Join KitaTolongKita 🤝</Text>
          <Text style={s.brandSubtitle}>
            Unlock huge community savings on groceries, makan & everyday essentials
          </Text>
        </View>

        {/* Avatar Upload */}
        <View style={s.avatarSection}>
          <TouchableOpacity style={s.avatarWrapper} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImage} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarPlaceholderIcon}>📷</Text>
              </View>
            )}
            <View style={s.avatarCameraBadge}>
              <Text style={s.avatarCameraIcon}>📸</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.avatarHint}>Add a profile photo</Text>
        </View>

        {/* Form Card */}
        <View style={s.card}>
          <Input
            label="Full Name"
            placeholder="e.g. Aiman Harith"
            value={name}
            onChangeText={setName}
            prefix="👤"
            containerStyle={s.input}
          />
          <Input
            label="Email"
            placeholder="name@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            prefix="📧"
            containerStyle={s.input}
          />
          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            prefix="🔒"
            containerStyle={s.input}
          />
          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            prefix="🔒"
            containerStyle={s.input}
          />
          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            fullWidth
          />
        </View>

        {/* Switch to Login */}
        <View style={s.loginRow}>
          <Text style={s.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={s.terms}>
          By creating an account, you agree to our{' '}
          <Text style={s.termsLink}>Terms of Service</Text> and{' '}
          <Text style={s.termsLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

