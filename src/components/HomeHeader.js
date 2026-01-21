import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

// Keep import (already in project). Not used now.
import LinearGradient from 'react-native-linear-gradient';

import { colors, hitSlop10 } from '../styles';
import { GetPremiumIcon, SettingsIcon } from './icons';
import { useSubscription } from '../providers/SubscriptionProvider';

const COLORS = {
  primary: colors.brandBlue,
  surface: colors.surface,
  white: colors.white,
  text: colors.text,
  muted: colors.muted,
  border: colors.border,

  // Flat “gold” (no gradient)
  premiumBg: '#F2B705',
  premiumBgPressed: '#E3AA00',
  premiumBorder: 'rgba(0,0,0,0.06)',
};

export default function HomeHeader({
  navigation,
  onPressSettings,
  showDivider = true,
}) {
  const { isPremium } = useSubscription();
  const canPressSettings = typeof onPressSettings === 'function';

  const handleGetPremium = () => {
    if (navigation) navigation.navigate('Paywall');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {/* Left */}
        <View style={styles.left}>
          {isPremium ? (
            <View style={styles.premiumChip} accessibilityLabel="Premium active">
              <Text style={styles.premiumChipText}>Premium</Text>
            </View>
          ) : (
            <GetPremiumButton onPress={handleGetPremium} />
          )}
        </View>

        {/* Right */}
        <View style={styles.right}>
          <TouchableOpacity
            onPress={canPressSettings ? onPressSettings : undefined}
            disabled={!canPressSettings}
            hitSlop={hitSlop10}
            activeOpacity={0.85}
            accessibilityRole={canPressSettings ? 'button' : undefined}
            accessibilityLabel="Settings"
            style={[styles.iconBtn, !canPressSettings && styles.disabled]}
          >
            <SettingsIcon size={23} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

function GetPremiumButton({ onPress }) {
  const [pressed, setPressed] = React.useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.premiumBtn,
        { backgroundColor: pressed ? COLORS.premiumBgPressed : COLORS.premiumBg },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Get Premium"
    >
      <GetPremiumIcon color={COLORS.white} size={16} />
      <Text style={styles.premiumBtnText}>Premium</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingTop: 10, paddingBottom: 10 },

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
  },

  // Smaller, cleaner Premium button
  premiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.premiumBorder,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(242, 183, 5, 0.45)',
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 3 },
    }),
  },
  premiumBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  // Premium active: subtle chip (smaller than before)
  premiumChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumChipText: {
    color: '#16A34A',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iconBtn: {
    width: 40,
    height: 40,
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