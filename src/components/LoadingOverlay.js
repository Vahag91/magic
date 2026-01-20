import * as React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { colors } from '../styles';

const TEXT = colors.text || '#111827';

export default function LoadingOverlay({ visible, message, preview }) {
  if (!visible) return null;

  const imageUri = preview?.imageUri || null;
  const maskUri = preview?.maskUri || null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="large" />
        <Text style={styles.title}>{message || 'Working…'}</Text>
        <Text style={styles.sub}>This can take a few seconds.</Text>

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="contain" />
            {maskUri ? (
              <Image
                source={{ uri: maskUri }}
                style={styles.previewMask}
                resizeMode="contain"
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: { marginTop: 12, fontSize: 16, fontWeight: '900', color: TEXT },
  sub: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#6B7280' },
  previewWrap: {
    marginTop: 14,
    width: '100%',
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  previewImg: { width: '100%', height: '100%' },
  previewMask: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    tintColor: '#FF0000',
  },
});
