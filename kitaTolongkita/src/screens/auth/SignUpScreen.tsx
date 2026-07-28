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

type Step = 'signup' | 'otp';

export const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('signup');
  const [loading, setLoading] = useState(false);

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
      // Sign up — API auto-sends OTP to email
      await authApi.emailSignup({ email, fullName: name, password });
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Sign up failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp(email, otp, 'EmailVerification');
      // OTP verified — now log in
      const res = await authApi.emailLogin({ email, password });
      await setAccessToken(res.accessToken);
      navigation.replace('ProfileSetup');
    } catch (err: any) {
      Alert.alert('Verification failed', err.message);
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
          <Text style={styles.headerTitle}>
            {step === 'signup' ? 'Create Account' : 'Verify Email'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>
            {step === 'signup' ? 'Join KitaTolongKita 🤝' : `Code sent to\n${email}`}
          </Text>
          <Text style={styles.brandSubtitle}>
            {step === 'signup'
              ? 'Create your account to start group buying with your community'
              : 'Enter the 6-digit code we sent to your email'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {step === 'signup' ? (
            <>
              <Input
                label="Full Name"
                placeholder="Ahmad bin Ali"
                value={name}
                onChangeText={setName}
                prefix="👤"
                containerStyle={styles.input}
              />
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
                placeholder="Min. 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                prefix="🔒"
                containerStyle={styles.input}
              />
              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
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
                title="Verify Email"
                onPress={handleVerifyOtp}
                loading={loading}
                fullWidth
              />
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => authApi.sendOtp(email, 'EmailVerification')}
              >
                <Text style={styles.resendText}>
                  Didn't get the code? <Text style={styles.resendLink}>Resend</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => setStep('signup')}
              >
                <Text style={styles.backLinkText}>← Change email address</Text>
              </TouchableOpacity>
            </>
          )}
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
  scrollContent: { padding: spacing.md, paddingTop: spacing.sm },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: { fontSize: 24, color: colors['on-surface'] },
  headerTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700',
    color: colors['on-background'],
  },
  branding: { marginBottom: spacing.xl },
  brandTitle: {
    fontFamily: 'NunitoSans_800ExtraBold', fontSize: 28, fontWeight: '800',
    color: colors['on-background'], marginBottom: spacing.sm, lineHeight: 36,
  },
  brandSubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: colors['on-surface-variant'],
    lineHeight: 22,
  },
  form: { marginBottom: spacing.xl },
  input: { marginBottom: spacing.md },
  resendBtn: { alignItems: 'center', marginTop: spacing.lg },
  resendText: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
  },
  resendLink: { color: colors['primary-container'], fontWeight: '600' },
  backLink: { alignItems: 'center', marginTop: spacing.sm },
  backLinkText: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['primary-container'],
    fontWeight: '600',
  },
  terms: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'],
    textAlign: 'center', lineHeight: 18,
  },
  termsLink: { color: colors['primary-container'], fontWeight: '600' },
});
