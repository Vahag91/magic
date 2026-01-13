import * as React from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProcessingMagicIcon } from '../../../components/icons';
import BeforeAfterSlider from '../components/BeforeAfterSlider';

const PRIMARY = '#2e69ff';

const DEFAULT_BEFORE = require('../../../../assets/onboarding/beforeobject.jpg');
const DEFAULT_AFTER = require('../../../../assets/onboarding/afterobject.jpg');

export default function ObjectRemovalSlide({
  index,
  animationController,
  beforeSource = DEFAULT_BEFORE,
  afterSource = DEFAULT_AFTER,
  onPrimaryPress = () => {},
  onSecondaryPress = () => {},
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

  const heroOpacity = animationController.current.interpolate({
    inputRange: [index - 0.2, index, index + 0.4],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  const heroTY = animationController.current.interpolate({
    inputRange: [index - 0.2, index],
    outputRange: [18, 0],
    extrapolate: 'clamp',
  });

  const textOpacity = animationController.current.interpolate({
    inputRange: [index - 0.1, index + 0.2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const textTY = animationController.current.interpolate({
    inputRange: [index - 0.1, index + 0.2],
    outputRange: [16, 0],
    extrapolate: 'clamp',
  });

  const actionsOpacity = animationController.current.interpolate({
    inputRange: [index - 0.1, index],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const actionsTY = animationController.current.interpolate({
    inputRange: [index - 0.1, index],
    outputRange: [20, 0],
    extrapolate: 'clamp',
  });

  const legalOpacity = animationController.current.interpolate({
    inputRange: [index + 0.1, index + 0.35],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const cardWidth = Math.min(width - 36, 410);
  const cardHeight = Math.max(280, cardWidth * (5 / 4));

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX: slideX }], opacity }]}>
      <View style={[styles.inner, { paddingTop: Math.max(18, insets.top + 54), paddingBottom: insets.bottom + 40 }]}>
     
        <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroTY }] }}>
          <View style={[styles.heroCard, { width: cardWidth }]}>
            <BeforeAfterSlider
              beforeSource={beforeSource}
              afterSource={afterSource}
              height={cardHeight}
              borderRadius={24}
              initial={0.52}
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateY: textTY }] }]}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#101318' }]}>
            Effortless object removal{'\n'}in your pocket.
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.7)' : '#6B7280' }]}>
            Erase unwanted people or items in seconds. Clean, precise, and ready to share.
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.actions, { opacity: actionsOpacity, transform: [{ translateY: actionsTY }] }]}>
          <Pressable onPress={onPrimaryPress} style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
            <Text style={styles.primaryText}>Get Started</Text>
          </Pressable>
          <Pressable
            onPress={onSecondaryPress}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(15,23,42,0.04)',
                borderColor: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.35)',
              },
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={[styles.secondaryText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              I already have an account
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.legal, { opacity: legalOpacity }]}>
          <Text style={[styles.legalText, { color: isDark ? 'rgba(255,255,255,0.45)' : '#9CA3AF' }]}>
            By continuing, you agree to our{'\n'}
            <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  inner: { width: '100%', maxWidth: 430, flex: 1, paddingHorizontal: 18, alignItems: 'center' },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 10 },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  brandText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },

  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
  },

  textBlock: { marginTop: 22, alignItems: 'center', paddingHorizontal: 6 },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 36, marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 300 },

  spacer: { flex: 1, minHeight: 16 },

  actions: { width: '100%', gap: 12 },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  btnPressed: { transform: [{ scale: 0.985 }] },

  legal: { marginTop: 18, alignItems: 'center' },
  legalText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  legalLink: { textDecorationLine: 'underline', textDecorationColor: 'rgba(148,163,184,0.7)' },
});
