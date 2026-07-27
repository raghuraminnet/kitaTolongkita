import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { colors, typography, borderRadius, spacing } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  prefix,
  suffix,
  containerStyle,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors['on-surface-variant']}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors['surface-container-low'],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors['outline-variant'],
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: colors['primary-container'],
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  prefix: {
    ...typography['body-lg'],
    color: colors['on-surface-variant'],
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography['body-lg'],
    color: colors['on-surface'],
    paddingVertical: spacing.md,
  },
  suffix: {
    ...typography['body-lg'],
    color: colors['on-surface-variant'],
    marginLeft: spacing.xs,
  },
  error: {
    ...typography['label-sm'],
    color: colors.error,
    marginTop: spacing.xs,
  },
});
