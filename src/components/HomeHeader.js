import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

import { colors, hitSlop10 } from '../styles';
import { SettingsIcon } from './icons';
import { useSubscription } from '../providers/SubscriptionProvider';

const COLORS = {
  primary: colors.brandBlue,
  surface: colors.surface,
  white: colors.white,
  text: colors.text,
  muted: colors.muted,
  border: colors.border,
};

export default function HomeHeader({
  onPressSettings,
  showDivider = true,
}) {
  const { isPremium } = useSubscription();

  const canPressSettings = typeof onPressSettings === 'function';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {/* Left */}
        <View style={styles.left}>
          <View style={styles.mark} accessibilityLabel="App icon">
            <Text style={styles.markText}>M</Text>
          </View>
        </View>

        {/* Right */}
        <View style={styles.right}>
          {isPremium ? (
            <View style={styles.proChip} accessibilityLabel="Premium active">
              <Text style={styles.proText}>PRO</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={canPressSettings ? onPressSettings : undefined}
            disabled={!canPressSettings}
            hitSlop={hitSlop10}
            activeOpacity={0.85}
            accessibilityRole={canPressSettings ? 'button' : undefined}
            accessibilityLabel="Settings"
            style={[styles.iconBtn, !canPressSettings && styles.disabled]}
          >
            <SettingsIcon size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingTop: 6, paddingBottom: 6 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 10,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(226,232,240,0.95)',
  },

  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  mark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  proChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 1 },
    }),
  },

  disabled: { opacity: 0.6 },
});
