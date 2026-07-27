import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, shadows } from '../theme';

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

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const isPost = tab.key === 'post';

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            {isPost ? (
              // FAB-style Post button
              <View style={styles.fab}>
                <Text style={styles.fabIcon}>+</Text>
              </View>
            ) : (
              <>
                <Text style={styles.icon}>{isActive ? tab.activeIcon : tab.icon}</Text>
                <Text style={[styles.label, isActive && styles.labelActive]}>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors['surface-container-lowest'],
    borderTopWidth: 0,
    ...shadows.card,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
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
