import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, shadows } from '../theme';

interface TabItem {
  key: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: '🏠', activeIcon: '🏡' },
  { key: 'search', label: 'Search', icon: '🔍', activeIcon: '🔎' },
  { key: 'post', label: 'Post', icon: '➕', activeIcon: '✛' },
  { key: 'orders', label: 'Orders', icon: '📦', activeIcon: '📦' },
  { key: 'profile', label: 'Profile', icon: '👤', activeIcon: '👤' },
];

interface BottomTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const s = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors['surface-container-lowest'],
      borderTopWidth: 0,
      paddingTop: spacing.sm,
      paddingBottom: Math.max(insets.bottom, 8),
      ...shadows.card,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    label: {
      ...typography['label-sm'],
      color: colors['on-surface-variant'],
      fontSize: 10,
    },
    labelActive: {
      color: colors['primary-container'],
      fontWeight: '700',
    },
    fab: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors['primary-container'],
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -20,
      ...shadows.modal,
    },
    fabIcon: {
      fontSize: 28,
      color: colors.white,
      fontWeight: '300',
      marginTop: -2,
    },
  });

  return (
    <View style={s.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const isPost = tab.key === 'post';

        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            {isPost ? (
              <View style={s.fab}>
                <Text style={s.fabIcon}>+</Text>
              </View>
            ) : (
              <>
                <Text style={s.icon}>{isActive ? tab.activeIcon : tab.icon}</Text>
                <Text style={[s.label, isActive && s.labelActive]}>
                  {tab.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
