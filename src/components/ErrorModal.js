import * as React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';

export default function ErrorModal({
  visible,
  title,
  message,
  onClose,
  onRetry,
  retryLabel = 'Retry',
}) {
  return (
    <Modal
      transparent
      visible={Boolean(visible)}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {typeof onRetry === 'function' ? (
              <Pressable onPress={onRetry} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>{retryLabel}</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>{typeof onRetry === 'function' ? 'Cancel' : 'OK'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 10 },
    }),
  },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  message: { fontSize: 14, fontWeight: '600', color: '#475569', lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  primaryBtn: {
    backgroundColor: '#3366FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryText: { color: '#0F172A', fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});

