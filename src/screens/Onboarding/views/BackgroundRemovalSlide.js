import * as React from 'react';
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ProcessingMagicIcon } from '../../../components/icons';
import TransparencyGrid from '../components/TransparencyGrid';
import OnboardingHeroCard from '../components/OnboardingHeroCard';

const PRIMARY = '#2e69ff';

const DEFAULT_SUBJECT = {
  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1Eue8hpNjTzwc_0ZO0L4UBOSgWzKVflJjK0q-4QqXlgufgo3_F3BaZlfqgB9SeTmCDn_-Qkc5yf7CGJa8XfH5a_Ar-PBbULDChEkftZbRCPmbKbK8pCQCnWuHJqW_Do2aXloif_5n6wObJ1dQEdYm_BwV1H_FeEb4oWRQnDHHLRUhY_yjUNVaEDjDu8joV77LQxV3TUK0MRQKg2XKI-G06tAugYbnXdMHb2svF7CLPmKOe-yJbkWKf7qgaL-Ayiy_pj_NkxmnIu5l',
};

export default function BackgroundRemovalSlide({
  index,
  animationController,
  subjectSource = DEFAULT_SUBJECT,
  layout,
  isActive = false,
}) {
  const isDark = false;
  const isCompact = layout?.isCompact;

  const titleFontSize = Math.round((isCompact ? 28 : 30) * layout.fontScale);
  const titleLineHeight = Math.round((isCompact ? 34 : 36) * layout.fontScale);
  const subtitleFontSize = Math.round((isCompact ? 15 : 16) * layout.fontScale);
  const subtitleLineHeight = Math.round((isCompact ? 22 : 24) * layout.fontScale);

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

  const subjectScale = animationController.current.interpolate({
    inputRange: [index - 0.6, index, index + 0.6],
    outputRange: [0.94, 1, 0.94],
    extrapolate: 'clamp',
  });

  const topPad = layout.topPad;
  const bottomPad = layout.bottomPad;
  const heroWidth = layout.heroWidth;
  const heroHeight = layout.heroHeight;
  const scanRange = Math.max(70, heroHeight * 0.28);

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

  const [contentHeight, setContentHeight] = React.useState(0);
  const scrollEnabled = contentHeight > layout.height + 1;

  return (
    <Animated.View pointerEvents={isActive ? 'auto' : 'none'} style={[styles.root, { opacity }]}>
      <ScrollView
        style={styles.scroll} // ✅ important: fixes weird width / horizontal drift
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad, paddingBottom: bottomPad }]}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        scrollEnabled={isActive && scrollEnabled}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false} // ✅
        horizontal={false} // ✅ explicit
        bounces={false}
        alwaysBounceVertical={false}
        alwaysBounceHorizontal={false} // ✅ iOS horizontal bounce OFF
        directionalLockEnabled // ✅ iOS lock to one direction
        overScrollMode="never" // ✅ Android
      >
        <View style={[styles.inner, { maxWidth: layout.maxWidth, paddingHorizontal: layout.sidePadding }]}>
          <Animated.View style={{ transform: [{ translateY: contentTY }] }}>
            <OnboardingHeroCard
              width={heroWidth}
              height={heroHeight}
              backgroundColor={isDark ? '#0F1523' : '#FFFFFF'}
              borderColor={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'}
            >
              <TransparencyGrid size={20} light={gridLight} dark={gridDark} style={StyleSheet.absoluteFill} />

              <LinearGradient pointerEvents="none" colors={[`${PRIMARY}10`, 'transparent']} style={StyleSheet.absoluteFill} />

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
                {
                  color: isDark ? '#FFFFFF' : '#101318',
                  fontSize: titleFontSize,
                  lineHeight: titleLineHeight,
                },
              ]}
            >
              Instant Background Removal
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark ? 'rgba(255,255,255,0.72)' : '#6B7280',
                  fontSize: subtitleFontSize,
                  lineHeight: subtitleLineHeight,
                },
              ]}
            >
              Turn any photo into a professional asset. Our AI detects subjects and erases the rest in seconds.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ✅ this is important to avoid any width weirdness
  scroll: { width: '100%' },

  scrollContent: { flexGrow: 1, width: '100%', alignItems: 'center' },
  inner: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  subjectWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
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
    width: 42,
    height: 42,
    borderRadius: 16,
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

  textBlock: { width: '100%', alignItems: 'center', paddingTop: 12 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: { textAlign: 'center', fontSize: 16, lineHeight: 24, maxWidth: 330 },
});
