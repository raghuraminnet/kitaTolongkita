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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, shadows, DISPLAY_FONT, BODY_FONT } from '../../theme';
import { authApi, setAccessToken } from '../../api/client';
import { signInWithGoogle } from '../../api/googleAuth';
import * as DemoMode from '../../api/demoMode';

type Step = 'login' | 'otp';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
      backgroundColor: colors['primary-container'],
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
      alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.md,
    },
    logoContainer: {
      width: 76, height: 76, borderRadius: 38,
      backgroundColor: colors['primary-container'], alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.sm,
      shadowColor: colors['primary-container'],
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    logo: { fontSize: 38 },
    appName: {
      fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: '800',
      color: colors['on-background'], marginBottom: 2,
    },
    tagline: { fontFamily: BODY_FONT, fontSize: 13.5, color: colors['on-surface-variant'] },
    demoBadge: {
      marginTop: spacing.xs,
      backgroundColor: colors['primary-container'],
      color: colors.white,
      fontFamily: BODY_FONT,
      fontSize: 10,
      fontWeight: '700',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    form: {
      backgroundColor: isDark ? colors['surface-container'] : colors.white,
      borderRadius: borderRadius.xl,
      padding: 22,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      ...shadows.card,
    },
    formTitle: {
      fontFamily: DISPLAY_FONT, fontSize: 22, fontWeight: '800',
      color: colors['on-background'], marginBottom: 4,
    },
    formSubtitle: {
      fontFamily: BODY_FONT, fontSize: 13.5, color: colors['on-surface-variant'],
      marginBottom: spacing.lg,
    },
    input: { marginBottom: spacing.md },
    forgotBtn: { alignItems: 'center', marginTop: spacing.md },
    forgotText: {
      fontFamily: BODY_FONT, fontSize: 13.5, color: colors.primary,
      fontWeight: '600',
    },
    dividerContainer: {
      flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors['outline-variant'] },
    dividerText: {
      fontFamily: BODY_FONT, fontSize: 13, color: colors['on-surface-variant'],
      paddingHorizontal: spacing.md,
    },
    socialButtons: { gap: spacing.md, marginBottom: spacing.lg },
    socialBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 13, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      backgroundColor: isDark ? colors['surface-container'] : colors.white,
    },
    socialBtnDisabled: { opacity: 0.5 },
    socialIcon: { fontSize: 18, marginRight: spacing.sm },
    socialText: {
      fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: '700',
      color: colors['on-surface'],
    },
    terms: {
      fontFamily: BODY_FONT, fontSize: 12, color: colors['on-surface-variant'],
      textAlign: 'center', lineHeight: 18,
    },
    termsLink: { color: colors.primary, fontWeight: '600' },
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
      console.error('Login error:', err);
      if (err.message === 'EMAIL_NOT_VERIFIED' || err.message?.toLowerCase().includes('verify')) {
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
