import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Search,
  PlusCircle,
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
  { key: 'search',  label: 'Search',  Icon: Search,  activeIcon: Search },
  { key: 'post',    label: 'Post',    Icon: PlusCircle, activeIcon: PlusCircle },
  { key: 'orders',  label: 'Orders',  Icon: Package,  activeIcon: Package },
  { key: 'profile', label: 'Profile', Icon: User,     activeIcon: User },
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

  const activeColor = colors['primary-container'];
  const inactiveColor = colors['on-surface-variant'];
  const iconSize = 22;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors['surface-container-lowest'],
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const isPost = tab.key === 'post';
        const IconComp = isActive ? tab.activeIcon : tab.Icon;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            {isPost ? (
              /* FAB for Post tab */
              <View
                style={[
                  styles.fab,
                  { backgroundColor: colors['primary-container'] },
                ]}
              >
                <PlusCircle
                  size={28}
                  color={colors.white}
                  strokeWidth={2.5}
                />
              </View>
            ) : (
              <>
                <IconComp
                  size={iconSize}
                  color={isActive ? activeColor : inactiveColor}
                  strokeWidth={isActive ? 2.5 : 2}
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
    borderTopWidth: 0,
    paddingTop: spacing.sm,
    ...shadows.card,
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  label: {
    ...typography['label-sm'],
    fontSize: 10,
    marginTop: 3,
  },
  labelActive: {
    fontWeight: '700',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    ...shadows.modal,
    elevation: 6,
  },
});
