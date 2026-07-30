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
import { colors, typography, spacing, borderRadius } from '../../theme';
import { authApi, setAccessToken } from '../../api/client';
import { signInWithGoogle } from '../../api/googleAuth';
import * as DemoMode from '../../api/demoMode';

type Step = 'login' | 'otp';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('login');
  const [loading, setLoading] = useState(false);

  const isDemo = DemoMode.isDemoMode();
  const demoCreds = isDemo ? DemoMode.getDemoCredentials() : null;

  // ── Email login ────────────────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      // Demo mode check
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
      navigation.replace('ProfileSetup');
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

  // ── Send OTP (for email verification) ────────────────────────────────────
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
      navigation.replace('ProfileSetup');
    } catch (err: any) {
      Alert.alert('Verification failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Demo Mode Banner */}
        {isDemo && (
          <TouchableOpacity style={styles.demoBanner} onPress={handleDemoLogin} activeOpacity={0.8}>
            <Text style={styles.demoBannerText}>🎮 Demo Mode — Tap here to explore all screens instantly</Text>
          </TouchableOpacity>
        )}

        {/* Logo & Branding */}
        <View style={styles.branding}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🤝</Text>
          </View>
          <Text style={styles.appName}>KitaTolongKita</Text>
          <Text style={styles.tagline}>Gotong Royong, Lebih Jimat!</Text>
          {isDemo && <Text style={styles.demoBadge}>DEMO</Text>}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {step === 'login' ? 'Welcome Back!' : 'Enter OTP'}
          </Text>
          <Text style={styles.formSubtitle}>
            {step === 'login'
              ? 'Sign in to your account'
              : `We sent a code to ${email}`}
          </Text>

          {step === 'login' ? (
            <>
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                prefix="📧"
                containerStyle={styles.input}
              />
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                prefix="🔒"
                containerStyle={styles.input}
              />

              <Button
                title="Sign In"
                onPress={handleEmailLogin}
                loading={loading}
                fullWidth
              />

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Input
                label="Verification Code"
                placeholder="000000"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                prefix="🔐"
                containerStyle={styles.input}
              />

              <Button
                title="Verify"
                onPress={handleVerifyOtp}
                loading={loading}
                fullWidth
              />

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => setStep('login')}
              >
                <Text style={styles.forgotText}>← Back to login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialBtn, isDemo && styles.socialBtnDisabled]}
            onPress={handleGoogleLogin}
            activeOpacity={0.7}
            disabled={isDemo}
          >
            <Text style={styles.socialIcon}>🍎</Text>
            <Text style={styles.socialText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, isDemo && styles.socialBtnDisabled]}
            onPress={handleGoogleLogin}
            activeOpacity={0.7}
            disabled={isDemo}
          >
            <Text style={styles.socialIcon}>📘</Text>
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Sign up link */}
        <Text style={styles.terms}>
          Don't have an account?{' '}
          <Text
            style={styles.termsLink}
            onPress={() => !isDemo && navigation.navigate('SignUp')}
          >
            Sign Up
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingTop: spacing.xl },
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
  socialBtnDisabled: {
    opacity: 0.5,
  },
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
