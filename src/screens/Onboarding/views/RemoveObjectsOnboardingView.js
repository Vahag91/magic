import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
  Platform,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Canvas,
  Group,
  Image as SkImage,
  Path,
  Skia,
  useImage,
} from '@shopify/react-native-skia';

const COLORS = {
  primary: '#2e69ff',
  bgLight: '#ffffff',
  text: '#101318',
  subText: '#5e6b8d',
  dotInactive: '#dadee7',
};

const BEFORE_IMG = require('../../../../assets/onboarding/beforeobject.jpg');
const AFTER_IMG = require('../../../../assets/onboarding/afterobject.jpg');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function RemoveObjectsOnboardingView({
  index,
  animationController,
  onSkip = () => {},
  onContinue = () => {},
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const slideX = Animated.multiply(Animated.subtract(index, animationController.current), width);

  const fadeIn = animationController.current.interpolate({
    inputRange: [index - 0.5, index, index + 0.5],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const headerTY = animationController.current.interpolate({
    inputRange: [index - 0.3, index],
    outputRange: [-16, 0],
    extrapolate: 'clamp',
  });

  const contentTY = animationController.current.interpolate({
    inputRange: [index - 0.3, index],
    outputRange: [10, 0],
    extrapolate: 'clamp',
  });

  const [cardSize, setCardSize] = React.useState({ w: 0, h: 0 });

  return (
    <Animated.View
      style={[
        styles.root,
        { transform: [{ translateX: slideX }], opacity: fadeIn, paddingTop: Math.max(10, insets.top) },
      ]}
    >
      <Animated.View style={[styles.topBar, { transform: [{ translateY: headerTY }] }]}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>✦</Text>
          </View>
          <Text style={styles.brandText}>Magic Studio</Text>
        </View>

        <Pressable onPress={onSkip} style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.main, { transform: [{ translateY: contentTY }] }]}>
        <View style={styles.heroWrap}>
          <View
            style={styles.heroCard}
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              if (w && h && (w !== cardSize.w || h !== cardSize.h)) setCardSize({ w, h });
            }}
          >
            <SkiaAutoBrushReveal
              beforeSource={BEFORE_IMG}
              afterSource={AFTER_IMG}
              width={cardSize.w}
              height={cardSize.h}
              // timing
              holdBeforeMs={700}
              brushDurationMs={1600}
              holdAfterMs={900}
              // brush look
              brushWidth={72}
              loop
            />

            {/* Optional overlay “tap” hint like your HTML */}
            <SelectionOverlay />
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.dotsRow}>
            <View style={styles.dotActivePill} />
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
          </View>

          <Text style={styles.h1}>Vanish Distractions</Text>
          <Text style={styles.p}>
            Effortlessly remove people, text, and clutter from your perfect shot in just one tap.
          </Text>

          <Pressable onPress={onContinue} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>

          <View style={{ height: Math.max(10, insets.bottom) }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * ✅ What it does:
 * 1) draw BEFORE
 * 2) animate a brush mask that reveals AFTER progressively
 * 3) when brushing completes -> fade BEFORE out (full AFTER)
 * 4) hold -> reset (optional loop)
 */
function SkiaAutoBrushReveal({
  beforeSource,
  afterSource,
  width,
  height,
  holdBeforeMs = 600,
  brushDurationMs = 1500,
  holdAfterMs = 900,
  brushWidth = 70,
  loop = true,
}) {
  const beforeImg = useImage(beforeSource);
  const afterImg = useImage(afterSource);

  const [maskProgress, setMaskProgress] = React.useState(0);
  const [beforeOpacity, setBeforeOpacity] = React.useState(1);
  const maskAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

  // Create a “scribble” path around target area (tuned to your example)
  const maskPath = React.useMemo(() => {
    if (!width || !height) return null;

    const p = Skia.Path.Make();
    const cx = 0.70 * width;
    const cy = 0.60 * height;

    p.moveTo(cx - 0.22 * width, cy + 0.10 * height);
    p.cubicTo(
      cx - 0.12 * width, cy - 0.14 * height,
      cx + 0.12 * width, cy - 0.12 * height,
      cx + 0.16 * width, cy + 0.02 * height,
    );
    p.cubicTo(
      cx + 0.20 * width, cy + 0.18 * height,
      cx - 0.02 * width, cy + 0.22 * height,
      cx - 0.14 * width, cy + 0.14 * height,
    );
    p.cubicTo(
      cx - 0.26 * width, cy + 0.02 * height,
      cx - 0.12 * width, cy - 0.02 * height,
      cx + 0.06 * width, cy + 0.06 * height,
    );

    return p;
  }, [width, height]);

  // Brush tip motion (polyline approximation)
  // animation loop
  React.useEffect(() => {
    if (!width || !height) return;
    if (!beforeImg || !afterImg) return;
    if (!maskPath) return;

    let alive = true;
    const maskListener = maskAnim.addListener(({ value }) => setMaskProgress(value));
    const opacityListener = opacityAnim.addListener(({ value }) => setBeforeOpacity(value));

    const run = async () => {
      while (alive) {
        // reset
        maskAnim.setValue(0);
        opacityAnim.setValue(1);

        await sleep(holdBeforeMs);

        // brush reveal
        Animated.timing(maskAnim, {
          toValue: 1,
          duration: brushDurationMs,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }).start();

        await sleep(brushDurationMs);

        // fade BEFORE out -> full AFTER
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        await sleep(420 + holdAfterMs);

        if (!loop) break;
      }
    };

    run();

    return () => {
      alive = false;
      maskAnim.removeListener(maskListener);
      opacityAnim.removeListener(opacityListener);
    };
  }, [
    afterImg,
    beforeImg,
    brushDurationMs,
    height,
    holdAfterMs,
    holdBeforeMs,
    loop,
    maskPath,
    maskAnim,
    opacityAnim,
    width,
  ]);

  if (!beforeImg || !afterImg || !width || !height || !maskPath) {
    return <View style={styles.skiaFallback} />;
  }

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        {/* AFTER (full, stays behind) */}
        <SkImage image={afterImg} x={0} y={0} width={width} height={height} fit="cover" />

        {/* BEFORE above, fades out at the end */}
        <Group opacity={beforeOpacity}>
          <SkImage image={beforeImg} x={0} y={0} width={width} height={height} fit="cover" />
        </Group>

        {/* Brushed area reveal on top of BEFORE:
            we draw AFTER again, then mask it with the brush stroke progress */}
        <Group layer>
          <SkImage image={afterImg} x={0} y={0} width={width} height={height} fit="cover" />
          <Path
            path={maskPath}
            style="stroke"
            strokeWidth={brushWidth}
            strokeCap="round"
            strokeJoin="round"
            color="white"
            start={0}
            end={maskProgress}
            blendMode="dstIn"
          />
        </Group>
      </Canvas>
    </View>
  );
}

function SelectionOverlay() {
  const pulse = React.useRef(new Animated.Value(0)).current;
  const floatY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    p.start();

    const f = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -4, duration: 900, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    f.start();

    return () => {
      p.stop();
      f.stop();
    };
  }, [pulse, floatY]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.06],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.overlayAnchor}>
        <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }] }]}>
          <Text style={styles.ringIcon}>Tap</Text>
        </Animated.View>

        <Animated.View style={[styles.finger, { transform: [{ translateY: floatY }] }]}>
          <Text style={styles.fingerIcon}>☝︎</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: COLORS.bgLight,
  },

  topBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(46,105,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: { color: COLORS.primary, fontSize: 16, fontWeight: '900' },
  brandText: { color: COLORS.text, fontSize: 16, fontWeight: '800' },

  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(245,246,248,1)',
  },
  skipBtnPressed: { opacity: 0.75 },
  skipText: { color: COLORS.subText, fontSize: 13, fontWeight: '700' },

  main: { flex: 1 },

  heroWrap: { paddingHorizontal: 14, paddingTop: 4 },
  heroCard: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 4 },
    }),
  },

  skiaFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E5E7EB',
  },

  overlay: { ...StyleSheet.absoluteFillObject },
  overlayAnchor: {
    position: 'absolute',
    right: '18%',
    bottom: '22%',
    width: 96,
    height: 96,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    backgroundColor: 'rgba(46,105,255,0.20)',
    borderWidth: 2,
    borderColor: 'rgba(46,105,255,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringIcon: { color: '#fff', fontSize: 14, fontWeight: '900' },
  finger: {
    position: 'absolute',
    right: -10,
    bottom: -12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 3 },
    }),
  },
  fingerIcon: { color: COLORS.primary, fontSize: 14, fontWeight: '900', marginTop: -1 },

  bottom: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    justifyContent: 'flex-end',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  dotActivePill: {
    width: 34,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dotInactive,
  },

  h1: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  p: {
    color: COLORS.subText,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 18,
  },

  cta: {
    height: 56,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 5 },
    }),
  },
  ctaPressed: { transform: [{ scale: 0.985 }] },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
