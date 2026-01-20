import * as React from 'react';
import { Animated, Image, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { ChevronRightIcon } from '../../../components/icons';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const PRIMARY = '#2e69ff';
const FONT_SCALE = 0.85;
const LABEL_FONT_SIZE = Math.round(11 * FONT_SCALE);
const LABEL_LETTER_SPACING = 0.6 * FONT_SCALE;

export default function BeforeAfterSlider({
  beforeSource,
  afterSource,
  initial = 0.5,
  height = 420,
  borderRadius = 22,
  lineWidth = 2,
  knobSize = 34,
  showLabels = true,
}) {
  const [layoutW, setLayoutW] = React.useState(0);
  const sliderX = React.useRef(new Animated.Value(0)).current;
  const sliderXNum = React.useRef(0);
  const startAt = React.useRef(0);

  const clampX = React.useCallback(
    (x) => {
      if (!layoutW) return x;
      const minX = knobSize / 2;
      const maxX = Math.max(minX, layoutW - knobSize / 2);
      return clamp(x, minX, maxX);
    },
    [knobSize, layoutW],
  );

  const setSlider = React.useCallback(
    (x) => {
      const next = clampX(x);
      sliderXNum.current = next;
      sliderX.setValue(next);
    },
    [clampX, sliderX],
  );

  const onLayout = React.useCallback(
    (e) => {
      const w = e?.nativeEvent?.layout?.width || 0;
      setLayoutW(w);
      const startX = Math.round(w * initial);
      const clampedStart = clamp(startX, knobSize / 2, Math.max(knobSize / 2, w - knobSize / 2));
      sliderXNum.current = clampedStart;
      sliderX.setValue(clampedStart);
    },
    [initial, knobSize, sliderX],
  );

  const pan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startAt.current = sliderXNum.current;
        },
        onPanResponderMove: (_, g) => {
          if (!layoutW) return;
          const next = clampX(startAt.current + g.dx);
          setSlider(next);
        },
      }),
    [clampX, layoutW, setSlider],
  );

  const beforeClipWidth = sliderX;
  const lineLeft = Animated.subtract(sliderX, lineWidth / 2);
  const knobLeft = Animated.subtract(sliderX, knobSize / 2);

  return (
    <View style={[styles.wrap, { height, borderRadius }]} onLayout={onLayout} {...pan.panHandlers}>
      {/* Background Image (After) - Static */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Image
          source={afterSource}
          style={[styles.imageAbs, { width: layoutW || 1, height }]}
          resizeMode="cover"
          resizeMethod="resize"
        />
      </View>

      {/* Foreground Image (Before) - Masked */}
      <Animated.View
        style={[
          styles.beforeClip,
          {
            width: beforeClipWidth, // This view shrinks/grows
            borderTopLeftRadius: borderRadius,
            borderBottomLeftRadius: borderRadius,
          },
        ]}
        pointerEvents="none"
      >
        <Image
          source={beforeSource}
          // ✅ Keep image full width, even if parent shrinks
          style={[styles.imageAbs, { width: layoutW || 1, height }]}
          resizeMode="cover"
          resizeMethod="resize"
        />
      </Animated.View>

      {showLabels ? (
        <>
          <View style={styles.beforeChip}>
            <Text style={styles.beforeText}>Before</Text>
          </View>
          <View style={styles.afterChip}>
            <Text style={styles.afterText}>After</Text>
          </View>
        </>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.line,
          {
            width: lineWidth,
            left: lineLeft,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            left: knobLeft,
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.knobIconWrap}>
          <ChevronRightIcon size={18} color={PRIMARY} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  imageAbs: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  full: {
    width: '100%',
    height: '100%',
  },
  beforeClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1, // Ensure it sits above the 'After' image
  },
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#fff',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    zIndex: 2,
  },
  knob: {
    position: 'absolute',
    top: '50%',
    marginTop: -17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  knobIconWrap: { transform: [{ rotate: '90deg' }] },

  beforeChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 2,
  },
  beforeText: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: LABEL_FONT_SIZE,
    fontWeight: '800',
    letterSpacing: LABEL_LETTER_SPACING,
  },

  afterChip: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(46,105,255,0.85)',
    zIndex: 0,
  },
  afterText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: LABEL_FONT_SIZE,
    fontWeight: '800',
    letterSpacing: LABEL_LETTER_SPACING,
  },
});
