import * as React from 'react';
import { Animated, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BeforeAfterSlider from '../components/BeforeAfterSlider';

const PRIMARY = '#2e69ff';

const DEFAULT_BEFORE = require('../../../../assets/onboarding/beforeobject.jpg');
const DEFAULT_AFTER = require('../../../../assets/onboarding/afterobject.jpg');

export default function WelcomeSlide({
  index,
  animationController,
  beforeSource = DEFAULT_BEFORE,
  afterSource = DEFAULT_AFTER,
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const slideX = Animated.multiply(Animated.subtract(index, animationController.current), width);

  const opacity = animationController.current.interpolate({
    inputRange: [index - 0.6, index, index + 0.6],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const contentTY = animationController.current.interpolate({
    inputRange: [index - 0.4, index, index + 0.4],
    outputRange: [18, 0, 18],
    extrapolate: 'clamp',
  });

  const cardScale = animationController.current.interpolate({
    inputRange: [index - 0.6, index, index + 0.6],
    outputRange: [0.96, 1, 0.96],
    extrapolate: 'clamp',
  });

  const cardWidth = Math.min(width - 36, 410);
  const cardHeight = Math.max(280, cardWidth * (5 / 4));

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX: slideX }], opacity }]}>
      <View style={[styles.inner, { paddingTop: Math.max(24, insets.top + 76), paddingBottom: insets.bottom + 140 }]}>
        <Animated.View style={{ transform: [{ translateY: contentTY }, { scale: cardScale }] }}>
          <View style={{ width: cardWidth }}>
            <BeforeAfterSlider
              beforeSource={beforeSource}
              afterSource={afterSource}
              height={cardHeight}
              borderRadius={22}
              initial={0.52}
              showLabels
            />
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.textBlock, { transform: [{ translateY: contentTY }] }]}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#101318' }]}>
            Welcome to{'\n'}
            <Text style={{ color: PRIMARY }}>Magic Studio</Text>
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.72)' : '#6B7280' }]}>
            The professional way to clean up your photos. Instantly remove backgrounds and unwanted objects with a single
            tap.
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 430,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  spacer: { flex: 1, minHeight: 18 },
  textBlock: { width: '100%', alignItems: 'center' },
  title: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 12,
  },
  subtitle: { textAlign: 'center', fontSize: 16, lineHeight: 24, maxWidth: 330 },
});
