import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
const CARD_RADIUS = 24;

export default function OnboardingHeroCard({
  width,
  height,
  backgroundColor = '#FFFFFF',
  borderColor = 'rgba(0,0,0,0.06)',
  radius = CARD_RADIUS,
  style,
  children,
}) {
  return (
    <View style={[styles.card, { width, height, backgroundColor, borderColor, borderRadius: radius }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
});
