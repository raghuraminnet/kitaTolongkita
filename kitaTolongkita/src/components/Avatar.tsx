import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../theme';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  verified?: boolean;
  style?: ViewStyle;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
  verified = false,
  style,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          {name ? (
            <Text style={[styles.initialsText, { fontSize: size * 0.35 }]}>
              {getInitials(name)}
            </Text>
          ) : (
            <Text style={[styles.initialsText, { fontSize: size * 0.35 }]}>👤</Text>
          )}
        </View>
      )}

      {verified && (
        <View style={[styles.badge, { right: -2, bottom: -2, width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125 }]}>
          <Text style={{ fontSize: size * 0.15 }}>✓</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative' },
  image: { backgroundColor: colors['surface-container'] },
  placeholder: {
    backgroundColor: colors['primary-container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: colors.white,
    fontWeight: '700',
    fontFamily: 'NunitoSans_700Bold',
  },
  badge: {
    position: 'absolute',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
