import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRightIcon } from '../../../components/icons';

const PRIMARY = '#2e69ff';

function Dot({ active }) {
  return <View style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />;
}

export default function OnboardingFooter({
  pageCount,
  pageIndex,
  primaryLabel,
  onPrimaryPress,
  disabled,
  backgroundColor = 'transparent',
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingBottom: Math.max(14, 10 + insets.bottom), backgroundColor }]}>
      <View style={styles.dotsRow}>
        {Array.from({ length: pageCount }).map((_, idx) => (
          <Dot key={idx} active={idx === pageIndex} />
        ))}
      </View>

      <Pressable
        onPress={disabled ? undefined : onPrimaryPress}
        style={({ pressed }) => [
          styles.button,
          (pressed && !disabled) ? styles.buttonPressed : null,
          disabled ? styles.buttonDisabled : null,
        ]}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>{primaryLabel}</Text>
          <ArrowRightIcon size={20} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    alignItems: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 26, backgroundColor: PRIMARY },
  dotInactive: { width: 8, backgroundColor: '#D1D5DB' },

  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  buttonPressed: { transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.6 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});

