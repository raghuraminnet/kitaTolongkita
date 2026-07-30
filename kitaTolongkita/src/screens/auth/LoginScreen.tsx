import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../../theme';
import { authApi, setAccessToken } from '../../api/client';
import { signInWithGoogle } from '../../api/googleAuth';
import * as DemoMode from '../../api/demoMode';

type Step = 'login' | 'otp';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('login');
  const [loading, setLoading] = useState(false);

  const isDemo = DemoMode.isDemoMode();
  const demoCreds = isDemo ? DemoMode.getDemoCredentials() : null;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: spacing.md, paddingTop: spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.xl) },
    demoBanner: {
      backgroundColor: '#FF7A30',
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      alignItems: 'center',
    },
    demoBannerText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      fontWeight: '600',
      color: colors.white,
      textAlign: 'center',
    },
    branding: {
      alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.xl,
    },
    logoContainer: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors['primary-container'], alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.md,
    },
    logo: { fontSize: 40 },
    appName: {
      fontFamily: 'NunitoSans_800ExtraBold', fontSize: 24, fontWeight: '800',
      color: colors['primary-container'], marginBottom: spacing.xs,
    },
    tagline: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'] },
    demoBadge: {
      marginTop: spacing.xs,
      backgroundColor: '#FF7A30',
      color: colors.white,
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
      fontWeight: '700',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    form: { marginBottom: spacing.xl },
    formTitle: {
      fontFamily: 'NunitoSans_700Bold', fontSize: 24, fontWeight: '700',
      color: colors['on-background'], marginBottom: spacing.xs,
    },
    formSubtitle: {
      fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
      marginBottom: spacing.xl,
    },
    input: { marginBottom: spacing.md },
    forgotBtn: { alignItems: 'center', marginTop: spacing.md },
    forgotText: {
      fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['primary-container'],
      fontWeight: '600',
    },
    dividerContainer: {
      flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors['outline-variant'] },
    dividerText: {
      fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
      paddingHorizontal: spacing.md,
    },
    socialButtons: { gap: spacing.md, marginBottom: spacing.xl },
    socialBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 14, borderRadius: borderRadius.lg,
      borderWidth: 1.5, borderColor: colors['outline-variant'],
      backgroundColor: colors['surface-container-lowest'],
    },
    socialBtnDisabled: { opacity: 0.5 },
    socialIcon: { fontSize: 20, marginRight: spacing.sm },
    socialText: {
      fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600',
      color: colors['on-surface'],
    },
    terms: {
      fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'],
      textAlign: 'center', lineHeight: 18,
    },
    termsLink: { color: colors['primary-container'], fontWeight: '600' },
  });

  // ── Email login ────────────────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (isDemo) {
        const result = await DemoMode.demoLogin(email, password);
        if (result) {
          await setAccessToken(result.token);
          navigation.replace('Main');
          return;
        }
      }
      const res = await authApi.emailLogin({ email, password });
      await setAccessToken(res.accessToken);
      if (res.user?.fullName) {
        navigation.replace('Main');
      } else {
        navigation.replace('ProfileSetup');
      }
    } catch (err: any) {
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        setStep('otp');
      } else {
        Alert.alert('Login failed', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Demo mode quick login ─────────────────────────────────────────────────
  const handleDemoLogin = async () => {
    if (!demoCreds) return;
    setLoading(true);
    try {
      const result = await DemoMode.demoLogin(demoCreds.email, demoCreds.password);
      if (result) {
        await setAccessToken(result.token);
        navigation.replace('Main');
      } else {
        Alert.alert('Demo error', 'Demo credentials not configured.');
      }
    } catch (err: any) {
      Alert.alert('Demo failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Google sign-in ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    if (isDemo) {
      Alert.alert('Demo Mode', 'Google login is disabled in demo mode.');
      return;
    }
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) { setLoading(false); return; }
      const res = await authApi.googleAuth(idToken);
      await setAccessToken(res.accessToken);
      navigation.replace('Main');
    } catch (err: any) {
      Alert.alert('Google sign-in failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Email required', 'Please enter your email first.');
      return;
    }
    if (isDemo) {
      Alert.alert('Demo Mode', 'OTP not needed in demo mode.');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(email, 'EmailVerification');
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Failed to send OTP', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp(email, otp, 'EmailVerification');
      const res = await authApi.emailLogin({ email, password });
      await setAccessToken(res.accessToken);
      if (res.user?.fullName) {
        navigation.replace('Main');
      } else {
        navigation.replace('ProfileSetup');
      }
    } catch (err: any) {
      Alert.alert('Verification failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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
        {isDemo && (
          <TouchableOpacity style={s.demoBanner} onPress={handleDemoLogin} activeOpacity={0.8}>
            <Text style={s.demoBannerText}>🎮 Demo Mode — Tap here to explore all screens instantly</Text>
          </TouchableOpacity>
        )}

        <View style={s.branding}>
          <View style={s.logoContainer}>
            <Text style={s.logo}>🤝</Text>
          </View>
          <Text style={s.appName}>KitaTolongKita</Text>
          <Text style={s.tagline}>Gotong Royong, Lebih Jimat!</Text>
          {isDemo && <Text style={s.demoBadge}>DEMO</Text>}
        </View>

        <View style={s.form}>
          <Text style={s.formTitle}>
            {step === 'login' ? 'Welcome Back!' : 'Enter OTP'}
          </Text>
          <Text style={s.formSubtitle}>
            {step === 'login'
              ? 'Sign in to your account'
              : `We sent a code to ${email}`}
          </Text>

          {step === 'login' ? (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                prefix="📧"
                containerStyle={s.input}
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                prefix="🔒"
                containerStyle={s.input}
              />

              <Button
                title="Sign In"
                onPress={handleEmailLogin}
                loading={loading}
                fullWidth
              />

              <TouchableOpacity
                style={s.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={s.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Input
                label="Verification Code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                prefix="🔐"
                containerStyle={s.input}
              />

              <Button
                title="Verify"
                onPress={handleVerifyOtp}
                loading={loading}
                fullWidth
              />

              <TouchableOpacity
                style={s.forgotBtn}
                onPress={() => setStep('login')}
              >
                <Text style={s.forgotText}>← Back to login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={s.dividerContainer}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <View style={s.socialButtons}>
          <TouchableOpacity
            style={[s.socialBtn, isDemo && s.socialBtnDisabled]}
            onPress={handleGoogleLogin}
            activeOpacity={0.7}
            disabled={isDemo}
          >
            <Text style={s.socialIcon}>🍎</Text>
            <Text style={s.socialText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.socialBtn, isDemo && s.socialBtnDisabled]}
            onPress={handleGoogleLogin}
            activeOpacity={0.7}
            disabled={isDemo}
          >
            <Text style={s.socialIcon}>📘</Text>
            <Text style={s.socialText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.terms}>
          Don't have an account?{' '}
          <Text
            style={s.termsLink}
            onPress={() => !isDemo && navigation.navigate('SignUp')}
          >
            Sign Up
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
