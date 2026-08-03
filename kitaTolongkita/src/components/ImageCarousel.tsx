import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: string[];
  height?: number;
  /** Show pagination dots. Default true */
  showDots?: boolean;
  /** Show left/right arrows. Default true */
  showArrows?: boolean;
  /** Render an overlay on top of each image (e.g. save button) */
  renderOverlay?: (index: number) => React.ReactNode;
  /** Placeholder when images array is empty */
  placeholder?: string;
  placeholderEmoji?: string;
  onPressImage?: (index: number) => void;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = 300,
  showDots = true,
  showArrows = true,
  renderOverlay,
  placeholder = 'No image',
  placeholderEmoji = '🛍️',
  onPressImage,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  if (images.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>{placeholderEmoji}</Text>
          <Text style={styles.placeholderText}>{placeholder}</Text>
        </View>
      </View>
    );
  }

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => onPressImage?.(index)}
      style={[styles.imageSlide, { width: SCREEN_WIDTH }]}
    >
      <Image source={{ uri: item }} style={[styles.image, { height }]} resizeMode="cover" />
      {renderOverlay && (
        <View style={styles.overlayContainer}>{renderOverlay(index)}</View>
      )}
    </TouchableOpacity>
  );

  const handlePrev = () => {
    if (activeIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
    }
  };

  const handleNext = () => {
    if (activeIndex < images.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderImage}
        keyExtractor={(item, index) => `img-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Dots */}
      {showDots && images.length > 1 && (
        <View style={styles.dotsContainer} pointerEvents="none">
          <View style={styles.dotsRow}>
            {images.map((_, i) => {
              const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 20, 8],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity,
                      backgroundColor: i === activeIndex ? colors.white : 'rgba(255,255,255,0.6)',
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Counter badge */}
      {images.length > 1 && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{activeIndex + 1}/{images.length}</Text>
        </View>
      )}

      {/* Arrows */}
      {showArrows && images.length > 1 && (
        <>
          {activeIndex > 0 && (
            <TouchableOpacity style={[styles.arrow, styles.arrowLeft]} onPress={handlePrev}>
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>
          )}
          {activeIndex < images.length - 1 && (
            <TouchableOpacity style={[styles.arrow, styles.arrowRight]} onPress={handleNext}>
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors['surface-container'],
  },
  imageSlide: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['surface-container-high'],
  },
  placeholderEmoji: { fontSize: 56, marginBottom: spacing.sm },
  placeholderText: {
    fontSize: 14,
    color: colors['on-surface-variant'],
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  counterBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  counterText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: spacing.sm },
  arrowRight: { right: spacing.sm },
  arrowText: { fontSize: 24, color: colors.white, fontWeight: '700' },
});
