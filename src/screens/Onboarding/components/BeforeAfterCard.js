import * as React from 'react';
import { Animated, Image, Platform, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronRightIcon, ProcessingMagicIcon } from '../../../components/icons';

const PRIMARY = '#2e69ff';

export default function BeforeAfterCard({
  beforeSource,
  afterSource,
  style,
  beforeLabel = 'Before',
  afterLabel = 'After',
}) {
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const knobScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.half}>
          {beforeSource ? (
            <Image source={beforeSource} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.fallback, { backgroundColor: '#E5E7EB' }]} />
          )}
        </View>
        <View style={styles.half}>
          {afterSource ? (
            <Image source={afterSource} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.fallback, { backgroundColor: '#FFFFFF' }]} />
          )}
        </View>
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.badge}>
        <View style={styles.badgeInner}>
          <ProcessingMagicIcon size={18} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.splitLine} pointerEvents="none" />

      <Animated.View
        pointerEvents="none"
        style={[styles.knob, { transform: [{ scale: knobScale }] }]}
      >
        <View style={styles.knobIcon}>
          <ChevronRightIcon size={18} color={PRIMARY} />
        </View>
      </Animated.View>

      <View style={styles.beforeChip}>
        <Text style={styles.beforeText}>{beforeLabel}</Text>
      </View>
      <View style={styles.afterChip}>
        <Text style={styles.afterText}>{afterLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
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
  row: { flexDirection: 'row', width: '100%', height: '100%' },
  half: { flex: 1 },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1 },

  badge: { position: 'absolute', top: 14, right: 14 },
  badgeInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  splitLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#fff',
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  knob: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 5 },
    }),
  },
  knobIcon: { transform: [{ rotate: '90deg' }] },

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
  },
  beforeText: { color: 'rgba(255,255,255,0.90)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },

  afterChip: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(46,105,255,0.85)',
  },
  afterText: { color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});

