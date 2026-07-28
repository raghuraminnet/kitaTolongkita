import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, borderRadius, typography } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      ...styles.base,
      ...(fullWidth ? { width: '100%' } : {}),
      ...(isDisabled ? { opacity: 0.5 } : {}),
    };

    if (variant === 'primary') {
      return { ...base, backgroundColor: colors['primary-container'] };
    }
    if (variant === 'secondary') {
      return {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.secondary,
      };
    }
    return { ...base, backgroundColor: 'transparent' };
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = { ...styles.text };
    if (isDisabled) return { ...base, opacity: 0.7 };

    if (variant === 'primary') {
      return { ...base, color: colors.white, fontWeight: '700' };
    }
    if (variant === 'secondary') {
      return { ...base, color: colors.secondary, fontWeight: '600' };
    }
    return { ...base, color: colors['primary-container'], fontWeight: '600' };
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.secondary}
          size="small"
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    ...typography['label-sm'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
