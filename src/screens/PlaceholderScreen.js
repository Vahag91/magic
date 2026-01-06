import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles';

export default function PlaceholderScreen({ route }) {
  const title = route?.params?.title || 'Screen';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Placeholder — we’ll build this next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  subtitle: { marginTop: 8, fontSize: 14, color: colors.muted },
});



