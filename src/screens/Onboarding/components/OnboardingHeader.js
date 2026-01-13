import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowBackIcon } from '../../../components/icons';

export default function OnboardingHeader({
  canGoBack,
  onBack,
  onSkip,
  textColor = '#111827',
  mutedColor = '#6B7280',
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: Math.max(14, insets.top + 6) }]}>
      <View style={styles.left}>
        {canGoBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
            <ArrowBackIcon size={22} color={textColor} />
          </Pressable>
        ) : (
          <View style={styles.leftSpacer} />
        )}
      </View>

      <View style={styles.right}>
        <Pressable onPress={onSkip} hitSlop={10} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: mutedColor }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  left: { flex: 1, alignItems: 'flex-start' },
  right: { flex: 1, alignItems: 'flex-end' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  leftSpacer: { width: 44, height: 44 },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16 },
  skipText: { fontSize: 15, fontWeight: '700' },
});

