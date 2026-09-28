import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Search,
  Plus,
  Package,
  User,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, shadows } from '../theme';

interface TabItem {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  activeIcon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const TABS: TabItem[] = [
  { key: 'home',    label: 'Home',    Icon: Home,    activeIcon: Home },
  { key: 'search',  label: 'Explore', Icon: Search,  activeIcon: Search },
  { key: 'post',    label: 'Kongsi',  Icon: Plus,    activeIcon: Plus },
  { key: 'orders',  label: 'Orders',  Icon: Package, activeIcon: Package },
  { key: 'profile', label: 'Profile', Icon: User,    activeIcon: User },
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
  const { colors, isDark } = useTheme();

  const activeColor = colors['primary-container'];
  const inactiveColor = colors['on-surface-variant'];
  const iconSize = 21;

  return (
    <View style={[styles.outerWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.88)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            // @ts-ignore
            backdropFilter: 'blur(24px)',
            // @ts-ignore
            WebkitBackdropFilter: 'blur(24px)',
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isPost = tab.key === 'post';
          const IconComp = isActive ? tab.activeIcon : tab.Icon;

          if (isPost) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.fabTab}
                onPress={() => onTabPress(tab.key)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.fab,
                    {
                      backgroundColor: colors['primary-container'],
                      shadowColor: colors['primary-container'],
                    },
                  ]}
                >
                  <Plus size={26} color={colors.white} strokeWidth={2.8} />
                </View>
                <Text style={[styles.fabLabel, { color: colors['primary-container'] }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && {
                  backgroundColor: isDark ? 'rgba(255, 107, 53, 0.12)' : 'rgba(255, 107, 53, 0.08)',
                },
              ]}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <IconComp
                size={iconSize}
                color={isActive ? activeColor : inactiveColor}
                strokeWidth={isActive ? 2.5 : 1.9}
              />
              <Text
                style={[
                  styles.label,
                  { color: isActive ? activeColor : inactiveColor },
                  isActive && styles.labelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.floating,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 18,
    minHeight: 46,
  },
  fabTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  label: {
    ...typography['label-sm'],
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
  fabLabel: {
    ...typography['label-sm'],
    fontSize: 10,
    marginTop: 4,
    fontWeight: '700',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
