import * as React from 'react';
import { Animated, Image, Platform, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProcessingMagicIcon } from '../../../components/icons';
import TransparencyGrid from '../components/TransparencyGrid';

const PRIMARY = '#2e69ff';

const DEFAULT_SUBJECT = {
  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1Eue8hpNjTzwc_0ZO0L4UBOSgWzKVflJjK0q-4QqXlgufgo3_F3BaZlfqgB9SeTmCDn_-Qkc5yf7CGJa8XfH5a_Ar-PBbULDChEkftZbRCPmbKbK8pCQCnWuHJqW_Do2aXloif_5n6wObJ1dQEdYm_BwV1H_FeEb4oWRQnDHHLRUhY_yjUNVaEDjDu8joV77LQxV3TUK0MRQKg2XKI-G06tAugYbnXdMHb2svF7CLPmKOe-yJbkWKf7qgaL-Ayiy_pj_NkxmnIu5l',
};

export default function BackgroundRemovalSlide({ index, animationController, subjectSource = DEFAULT_SUBJECT }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

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

  const subjectScale = animationController.current.interpolate({
    inputRange: [index - 0.6, index, index + 0.6],
    outputRange: [0.94, 1, 0.94],
    extrapolate: 'clamp',
  });

  const cardWidth = Math.min(width - 36, 410);
  const fullCardHeight = cardWidth * (5 / 4);
  const cardHeight = Math.max(260, Math.min(fullCardHeight, height * 0.52));
  const scanRange = Math.max(70, cardHeight * 0.28);

  const badgeAnim = React.useRef(new Animated.Value(0)).current;
  const scanAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const badgeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(badgeAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    badgeLoop.start();
    return () => badgeLoop.stop();
  }, [badgeAnim]);

  React.useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    scanLoop.start();
    return () => scanLoop.stop();
  }, [scanAnim]);

  const badgeTY = badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const scanTY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-scanRange, scanRange] });
  const scanOpacity = scanAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.85, 0.2] });

  const gridLight = isDark ? '#374151' : '#F3F4F6';
  const gridDark = isDark ? '#1F2937' : '#E5E7EB';

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX: slideX }], opacity }]}>
      <View style={[styles.inner, { paddingTop: Math.max(24, insets.top + 76), paddingBottom: insets.bottom + 140 }]}>
        <Animated.View style={{ transform: [{ translateY: contentTY }] }}>
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                height: cardHeight,
                backgroundColor: isDark ? '#0F1523' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <TransparencyGrid
              size={20}
              light={gridLight}
              dark={gridDark}
              style={StyleSheet.absoluteFill}
            />

            <LinearGradient
              pointerEvents="none"
              colors={[`${PRIMARY}10`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />

            <Animated.View style={[styles.subjectWrap, { transform: [{ scale: subjectScale }] }]}>
              <View style={styles.subjectShadow}>
                <Image source={subjectSource} style={styles.subjectImage} resizeMode="contain" />
              </View>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.scanLine,
                {
                  backgroundColor: `${PRIMARY}80`,
                  transform: [{ translateY: scanTY }],
                  opacity: scanOpacity,
                },
              ]}
            />

            <Animated.View
              style={[
                styles.badge,
                {
                  transform: [{ translateY: badgeTY }],
                  backgroundColor: isDark ? 'rgba(17,24,39,0.88)' : 'rgba(255,255,255,0.92)',
                  borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.65)',
                },
              ]}
            >
              <ProcessingMagicIcon size={22} color={PRIMARY} />
            </Animated.View>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.textBlock, { transform: [{ translateY: contentTY }] }]}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>Instant Background Removal</Text>
          <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.72)' : '#6B7280' }]}>
            Turn any photo into a professional asset. Our AI detects subjects and erases the rest in seconds.
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
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 6 },
    }),
  },
  subjectWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  subjectShadow: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 14 },
      },
      android: { elevation: 8 },
    }),
  },
  subjectImage: { width: '100%', height: '100%' },

  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    shadowColor: PRIMARY,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },

  spacer: { flex: 1, minHeight: 18 },
  textBlock: { width: '100%', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.6, marginBottom: 10 },
  subtitle: { textAlign: 'center', fontSize: 16, lineHeight: 24, maxWidth: 330 },
});

