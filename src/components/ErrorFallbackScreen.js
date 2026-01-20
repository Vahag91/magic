import * as React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GENERIC_ERROR_MESSAGE, GENERIC_ERROR_TITLE } from '../lib/errors';

export default function ErrorFallbackScreen({
  title = GENERIC_ERROR_TITLE,
  message = GENERIC_ERROR_MESSAGE,
  onRetry,
  secondaryLabel,
  onSecondary,
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.actions}>
          {typeof onRetry === 'function' ? (
            <Pressable onPress={onRetry} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          ) : null}

          {typeof onSecondary === 'function' ? (
            <Pressable onPress={onSecondary} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>{secondaryLabel || 'Back'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 8 },
    }),
  },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  message: { fontSize: 14, fontWeight: '600', color: '#475569', lineHeight: 20 },
  actions: { marginTop: 16, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  primaryBtn: { backgroundColor: '#3366FF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  secondaryBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  secondaryText: { color: '#0F172A', fontWeight: '900', fontSize: 14 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});

