import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Snap points as percentage of screen height. Default [0.5] */
  snapPoints?: number[];
  /** Render a custom drag handle. Default: standard handle */
  renderHandle?: () => React.ReactNode;
  /** Show a large grab handle at top. Default true */
  showHandle?: boolean;
  /** Enable scroll inside the sheet. Default true */
  scrollable?: boolean;
  /** Avoid keyboard. Default true */
  avoidKeyboard?: boolean;
  /** Overlay opacity. Default 0.4 */
  overlayOpacity?: number;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  snapPoints = [0.5],
  renderHandle,
  showHandle = true,
  scrollable = true,
  avoidKeyboard = true,
  overlayOpacity = 0.4,
}) => {
  const insets = useSafeAreaInsets();
  const animatedY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnimated = useRef(new Animated.Value(0)).current;

  const snapTo = snapPoints[Math.min(snapPoints.length - 1, 0)];
  const targetY = SCREEN_HEIGHT * (1 - snapTo);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(animatedY, {
          toValue: targetY,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(overlayAnimated, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animatedY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnimated, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, targetY]);

  if (!visible) return null;

  const content = (
    <Animated.View
      style={[
        styles.sheet,
        {
          transform: [{ translateY: animatedY }],
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      {showHandle && (
        <View style={styles.handleWrap}>
          {renderHandle ? (
            renderHandle()
          ) : (
            <View style={styles.handle} />
          )}
        </View>
      )}

      {(title || subtitle) && (
        <View style={styles.header}>
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      )}

      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.staticContent}>{children}</View>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.root} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayAnimated.interpolate({
                inputRange: [0, 1],
                outputRange: [0, overlayOpacity],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
};

// ── Quick Actions Sheet ──────────────────────────────────────────────────────

interface QuickActionItem {
  icon: string;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface QuickActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: QuickActionItem[];
}

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({
  visible,
  onClose,
  title = 'Actions',
  actions,
}) => {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      scrollable={false}
      snapPoints={[actions.length <= 3 ? 0.35 : 0.5]}
    >
      <View style={actionStyles.list}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              actionStyles.item,
              index < actions.length - 1 && actionStyles.itemBorder,
              action.destructive && actionStyles.destructiveItem,
              action.disabled && actionStyles.disabledItem,
            ]}
            onPress={() => {
              if (action.disabled) return;
              onClose();
              setTimeout(() => action.onPress(), 300);
            }}
            disabled={action.disabled}
            activeOpacity={0.7}
          >
            <Text style={actionStyles.icon}>{action.icon}</Text>
            <View style={actionStyles.textWrap}>
              <Text
                style={[
                  actionStyles.label,
                  action.destructive && actionStyles.destructiveLabel,
                  action.disabled && actionStyles.disabledLabel,
                ]}
              >
                {action.label}
              </Text>
              {action.description && (
                <Text style={actionStyles.description}>{action.description}</Text>
              )}
            </View>
            <Text style={actionStyles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheetModal>
  );
};

const actionStyles = StyleSheet.create({
  list: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors['outline-variant'],
  },
  destructiveItem: {},
  disabledItem: { opacity: 0.4 },
  icon: { fontSize: 20, marginRight: spacing.md },
  textWrap: { flex: 1 },
  label: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    fontWeight: '500',
  },
  destructiveLabel: { color: colors.error },
  disabledLabel: { color: colors['on-surface-variant'] },
  description: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors['on-surface-variant'],
    marginLeft: spacing.sm,
  },
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors['surface-container-lowest'],
    borderTopLeftRadius: borderRadius.xl * 2,
    borderTopRightRadius: borderRadius.xl * 2,
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...shadows.modal,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors['outline-variant'],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography['title-md'],
    color: colors['on-surface'],
  },
  subtitle: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  staticContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
