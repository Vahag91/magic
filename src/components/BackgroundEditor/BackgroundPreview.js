import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const clamp = (v, min, max) => {
  'worklet';
  return Math.min(max, Math.max(min, v));
};

function computeContainSize(containerW, containerH, imageRatio) {
  // imageRatio = w/h
  if (!containerW || !containerH || !imageRatio) return { w: 0, h: 0 };

  const containerRatio = containerW / containerH;

  if (containerRatio > imageRatio) {
    // container wider -> fit by height
    const h = containerH;
    const w = h * imageRatio;
    return { w, h };
  } else {
    // container taller -> fit by width
    const w = containerW;
    const h = w / imageRatio;
    return { w, h };
  }
}

export default React.forwardRef(function BackgroundPreview(
  {
    subjectUri,
    mode,
    previewBgStyle,
    aspectRatio, // subject w/h (from Image.getSize in screen)
    showCheckerboard,
    blurStrength,
    dimBackground,
    onCompare,

    // subject tool + limits
    subjectTool = 'move', // 'move' | 'scale'
    minScale = 0.2,
    maxScale = 5,
  },
  ref
) {
  const [layout, setLayout] = React.useState({ w: 0, h: 0 });
  const [baseSize, setBaseSize] = React.useState({ w: 0, h: 0 });

  // Shared values for smooth gesture transforms
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  // Shared values for clamping
  const cw = useSharedValue(0);
  const ch = useSharedValue(0);
  const bw = useSharedValue(0);
  const bh = useSharedValue(0);

  const clampToBounds = React.useCallback(() => {
    // JS helper used only for button actions; gesture uses worklet clamp below
    const cW = cw.value;
    const cH = ch.value;
    const bW = bw.value;
    const bH = bh.value;
    const s = scale.value;

    const halfW = (bW * s) / 2;
    const halfH = (bH * s) / 2;

    const maxX = Math.max(0, halfW - cW / 2);
    const maxY = Math.max(0, halfH - cH / 2);

    tx.value = clamp(tx.value, -maxX, maxX);
    ty.value = clamp(ty.value, -maxY, maxY);
  }, [bw, bh, cw, ch, scale, tx, ty]);

  // Update sizes when container layout or aspectRatio changes
  React.useEffect(() => {
    const { w, h } = layout;
    if (!w || !h || !aspectRatio) return;

    const contain = computeContainSize(w, h, aspectRatio);
    setBaseSize(contain);

    cw.value = w;
    ch.value = h;
    bw.value = contain.w;
    bh.value = contain.h;

    // After recompute, clamp current position to avoid sudden out-of-bounds
    // (e.g., after swapping original/cutout)
    clampToBounds();
  }, [layout, aspectRatio, clampToBounds, bw, bh, cw, ch]);

  // Imperative API for SubjectControls (Center/Fit/Reset + get state)
  React.useImperativeHandle(ref, () => ({
    center: () => {
      tx.value = withTiming(0, { duration: 180 });
      ty.value = withTiming(0, { duration: 180 });
    },
    fit: () => {
      // contain fit = scale 1 + centered (safe, no crop)
      scale.value = withTiming(1, { duration: 180 });
      tx.value = withTiming(0, { duration: 180 });
      ty.value = withTiming(0, { duration: 180 });
    },
    reset: () => {
      scale.value = withTiming(1, { duration: 180 });
      tx.value = withTiming(0, { duration: 180 });
      ty.value = withTiming(0, { duration: 180 });
    },
    getTransform: () => ({
      x: tx.value,
      y: ty.value,
      scale: scale.value,
    }),
  }));

  // Gesture state
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => {
      panStartX.value = tx.value;
      panStartY.value = ty.value;
    })
    .onUpdate((e) => {
      const cW = cw.value;
      const cH = ch.value;
      const bW = bw.value;
      const bH = bh.value;
      const s = scale.value;

      const halfW = (bW * s) / 2;
      const halfH = (bH * s) / 2;

      const maxX = Math.max(0, halfW - cW / 2);
      const maxY = Math.max(0, halfH - cH / 2);

      const nextX = panStartX.value + e.translationX;
      const nextY = panStartY.value + e.translationY;

      tx.value = clamp(nextX, -maxX, maxX);
      ty.value = clamp(nextY, -maxY, maxY);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate((e) => {
      const cW = cw.value;
      const cH = ch.value;
      const bW = bw.value;
      const bH = bh.value;

      const nextScale = clamp(pinchStartScale.value * e.scale, minScale, maxScale);
      scale.value = nextScale;

      // clamp translation after scale changes
      const halfW = (bW * nextScale) / 2;
      const halfH = (bH * nextScale) / 2;

      const maxX = Math.max(0, halfW - cW / 2);
      const maxY = Math.max(0, halfH - cH / 2);

      tx.value = clamp(tx.value, -maxX, maxX);
      ty.value = clamp(ty.value, -maxY, maxY);
    });

  // Move: pan only
  // Scale: pan + pinch (recommended UX)
  const composedGesture =
    subjectTool === 'scale' ? Gesture.Simultaneous(pan, pinch) : pan;

  const subjectStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const onLayoutCard = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ w: width, h: height });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, previewBgStyle]} onLayout={onLayoutCard}>
        {/* LAYERS */}
        {mode === 'transparent' && showCheckerboard && (
          <View style={styles.checkerboard} pointerEvents="none" />
        )}

        {mode === 'image' && (
          <View style={styles.imageBgPlaceholder} pointerEvents="none" />
        )}

        {mode === 'blur' && (
          <View
            pointerEvents="none"
            style={[styles.blurOverlay, { opacity: Math.min(0.6, blurStrength / 100) }]}
          />
        )}

        {mode === 'blur' && (
          <View
            pointerEvents="none"
            style={[styles.dimOverlay, { opacity: Math.min(0.45, dimBackground / 100) }]}
          />
        )}

        {/* SUBJECT STAGE (centered) */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.subjectStage}>
            {/* If baseSize not ready yet, still render with full fill to avoid flicker */}
            {baseSize.w > 0 && baseSize.h > 0 ? (
              <AnimatedImage
                source={{ uri: subjectUri }}
                style={[
                  { width: baseSize.w, height: baseSize.h },
                  subjectStyle,
                ]}
                resizeMode="contain"
                fadeDuration={0}
                // Android
                progressiveRenderingEnabled
                resizeMethod="resize"
              />
            ) : (
              <AnimatedImage
                source={{ uri: subjectUri }}
                style={[styles.fallbackFull, subjectStyle]}
                resizeMode="contain"
                fadeDuration={0}
                progressiveRenderingEnabled
                resizeMethod="resize"
              />
            )}
          </Animated.View>
        </GestureDetector>

        {/* Compare Button */}
        <TouchableOpacity style={styles.compareBtn} onPress={onCompare} activeOpacity={0.9}>
          <Text style={styles.compareIcon}>≍</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', justifyContent: 'center' },

  // ✅ FIXED PREVIEW SIZE (no jumping)
  card: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 4 / 5,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
      android: { elevation: 10 },
    }),
  },

  subjectStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fallbackFull: { width: '100%', height: '100%' },

  compareBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
  compareIcon: { fontSize: 20, fontWeight: '800', color: '#374151', marginTop: -2 },

  checkerboard: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', opacity: 0.5 },
  imageBgPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E5E7EB' },
  blurOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff' },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
});