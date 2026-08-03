import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableTextProps {
  text: string;
  /** Max lines when collapsed. Default 4 */
  collapsedLines?: number;
  /** Custom expand label. Default "Show more" */
  expandLabel?: string;
  /** Custom collapse label. Default "Show less" */
  collapseLabel?: string;
  textStyle?: any;
  containerStyle?: any;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  collapsedLines = 4,
  expandLabel = 'Show more',
  collapseLabel = 'Show less',
  textStyle,
  containerStyle,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const textRef = useRef<Text>(null);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={containerStyle}>
      <Text
        ref={textRef}
        style={[styles.text, textStyle]}
        numberOfLines={expanded ? undefined : collapsedLines}
        // On layout, check if text was truncated to show the toggle
        onTextLayout={(e) => {
          // Show toggle if text has more lines than collapsedLines
          if (!showToggle && e.nativeEvent.lines.length > collapsedLines) {
            setShowToggle(true);
          }
        }}
      >
        {text}
      </Text>

      {showToggle && (
        <TouchableOpacity onPress={handleToggle} activeOpacity={0.7} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {expanded ? `↑ ${collapseLabel}` : `↓ ${expandLabel}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    lineHeight: 26,
  },
  toggle: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  toggleText: {
    ...typography['label-sm'],
    color: colors['primary-container'],
    fontWeight: '700',
  },
});
