import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AppIcon({ size = 36 }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 3 }]}>
      <Text style={[styles.markText, { fontSize: size / 2.25 }]}>M</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.2,
  },
});
