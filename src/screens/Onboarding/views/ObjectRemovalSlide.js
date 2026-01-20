import * as React from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import OnboardingHeroCard from '../components/OnboardingHeroCard';

const DEFAULT_BEFORE = require('../../../../assets/onboarding/beforeobject.jpg');
const DEFAULT_AFTER = require('../../../../assets/onboarding/afterobject.jpg');

export default function ObjectRemovalSlide({
  index,
  animationController,
  beforeSource = DEFAULT_BEFORE,
  afterSource = DEFAULT_AFTER,
  layout,
  isActive = false,
}) {
  const isDark = false;
  const isCompact = layout?.isCompact;

  const titleFontSize = Math.round((isCompact ? 28 : 30) * layout.fontScale);
  const titleLineHeight = Math.round((isCompact ? 34 : 36) * layout.fontScale);
  const subtitleFontSize = Math.round((isCompact ? 15 : 16) * layout.fontScale);
  const subtitleLineHeight = Math.round((isCompact ? 22 : 24) * layout.fontScale);

  const [contentHeight, setContentHeight] = React.useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = React.useState(false);
  const scrollEnabled = isActive && !isDraggingSlider && contentHeight > layout.height + 1;

  const opacity = animationController.current.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const contentTY = animationController.current.interpolate({
    inputRange: [index - 0.4, index, index + 0.4],
    outputRange: [18, 0, 18],
    extrapolate: 'clamp',
  });

  const topPad = layout.topPad;
  const bottomPad = layout.bottomPad;
  const heroWidth = layout.heroWidth;
  const heroHeight = layout.heroHeight;

  return (
    <Animated.View pointerEvents={isActive ? 'auto' : 'none'} style={[styles.root, { opacity }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad, paddingBottom: bottomPad }]}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        alwaysBounceHorizontal={false} // ✅
        directionalLockEnabled         // ✅
        horizontal={false}
        overScrollMode="never"
      >
        <View style={[styles.inner, { maxWidth: layout.maxWidth, paddingHorizontal: layout.sidePadding }]}>
          <Animated.View style={{ transform: [{ translateY: contentTY }] }}>
            <OnboardingHeroCard
              width={heroWidth}
              height={heroHeight}
              backgroundColor={isDark ? '#0F1523' : '#FFFFFF'}
              borderColor={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'}
            >
              <BeforeAfterSlider
                beforeSource={beforeSource}
                afterSource={afterSource}
                height={heroHeight}
                borderRadius={layout.cardRadius}
                initial={0.52}
                onDraggingChange={setIsDraggingSlider} // ✅ critical fix
              />
            </OnboardingHeroCard>
          </Animated.View>

          <Animated.View
            style={[
              styles.textBlock,
              { transform: [{ translateY: contentTY }], maxWidth: layout.maxWidth, paddingHorizontal: layout.sidePadding },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : '#101318', fontSize: titleFontSize, lineHeight: titleLineHeight },
              ]}
            >
              Effortless object removal
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? 'rgba(255,255,255,0.72)' : '#6B7280', fontSize: subtitleFontSize, lineHeight: subtitleLineHeight },
              ]}
            >
              Erase unwanted people or items in seconds. Clean, precise, and ready to share.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scroll: { width: '100%' },
  scrollContent: { flexGrow: 1, width: '100%', alignItems: 'center' },
  inner: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  textBlock: { width: '100%', alignItems: 'center', paddingTop: 12 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 330 },
});
