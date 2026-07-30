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
import { authApi } from '../../api/client';

type Step = 'email' | 'otp' | 'newPassword';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Send reset OTP ─────────────────────────────────────────────────────────
  const handleSendResetOtp = async () => {
    if (!email) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setStep('otp');
      startResendCooldown();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend cooldown timer ─────────────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Verify OTP then proceed to new password step ─────────────────────────
  const handleVerifyOtpFixed = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      // First verify OTP is valid
      await authApi.verifyOtp(email, otp, 'PasswordReset');
      setStep('newPassword');
    } catch (err: any) {
      Alert.alert('Invalid code', err.message || 'The code is incorrect or has expired.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ─────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter your password.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email, newPassword, otp);
      Alert.alert(
        'Password Reset',
        'Your password has been reset successfully. Please sign in with your new password.',
        [{ text: 'Sign In', onPress: () => navigation.replace('Login') }]
      );
    } catch (err: any) {
      Alert.alert('Reset failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔑</Text>
          </View>
          <Text style={styles.title}>
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Enter Code'}
            {step === 'newPassword' && 'New Password'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'email' && "Enter your email and we'll send you a reset code."}
            {step === 'otp' && `We sent a code to ${email}. It expires in 10 minutes.`}
            {step === 'newPassword' && 'Create a new password for your account.'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {step === 'email' && (
            <>
              <Input
                label="Email"
                
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                prefix="📧"
                containerStyle={styles.input}
              />
              <Button
                title="Send Reset Code"
                onPress={handleSendResetOtp}
                loading={loading}
                fullWidth
              />
            </>
          )}

          {step === 'otp' && (
            <>
              <Input
                label="Reset Code"
                
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                prefix="🔐"
                containerStyle={styles.input}
              />
              <Button
                title="Verify Code"
                onPress={handleVerifyOtpFixed}
                loading={loading}
                fullWidth
              />
              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't get it?</Text>
                <TouchableOpacity
                  onPress={handleSendResetOtp}
                  disabled={resendCooldown > 0}
                >
                  <Text style={[styles.resendBtn, resendCooldown > 0 && styles.resendBtnDisabled]}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <Input
                label="New Password"
                
                value={newPassword}
                onChangeText={setNewPassword}
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
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                fullWidth
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingTop: spacing.lg },
  backBtn: { marginBottom: spacing.xl },
  backText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    fontWeight: '500',
    color: colors['on-surface-variant'],
  },
  header: { marginBottom: spacing.xl },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors['primary-container'],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: { fontSize: 32 },
  title: {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 28,
    fontWeight: '700',
    color: colors['on-background'],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors['on-surface-variant'],
    lineHeight: 22,
  },
  form: { gap: spacing.md },
  input: { marginBottom: spacing.xs },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  resendText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors['on-surface-variant'],
  },
  resendBtn: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: colors['primary-container'],
  },
  resendBtnDisabled: {
    color: colors['on-surface-variant'],
  },
});
