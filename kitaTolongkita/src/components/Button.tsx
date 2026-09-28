import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { typography, borderRadius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'emerald';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
  icon,
}) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      ...styles.base,
      ...(fullWidth ? { width: '100%' } : {}),
      ...(isDisabled ? { opacity: 0.55 } : {}),
    };

    if (variant === 'primary') {
      return {
        ...base,
        backgroundColor: colors['primary-container'],
        shadowColor: colors['primary-container'],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
      };
    }
    if (variant === 'emerald') {
      return {
        ...base,
        backgroundColor: colors.secondary,
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
      };
    }
    if (variant === 'secondary') {
      return {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors['outline'],
      };
    }
    return { ...base, backgroundColor: 'transparent' };
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = { ...styles.text };

    if (variant === 'primary' || variant === 'emerald') {
      return { ...base, color: '#ffffff', fontWeight: '700' };
    }
    if (variant === 'secondary') {
      return { ...base, color: colors['on-surface'], fontWeight: '600' };
    }
    return { ...base, color: colors['primary-container'], fontWeight: '600' };
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'emerald' ? '#ffffff' : colors['primary-container']}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    ...typography['label-sm'],
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
