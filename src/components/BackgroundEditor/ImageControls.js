import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors } from '../../styles';
import { RECENT_BACKGROUNDS } from './constants';

const PRIMARY_DARK = colors.blue600;

export default function ImageControls({ onChoosePhoto }) {
  return (
    <View style={styles.controlsBlock}>
      <TouchableOpacity style={styles.choosePhotoBtn} activeOpacity={0.9} onPress={onChoosePhoto}>
        <Text style={styles.choosePhotoText}>Choose Photo</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { marginTop: 14 }]}>RECENT BACKGROUNDS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentsRow}>
        {RECENT_BACKGROUNDS.map((r) => (
          <TouchableOpacity
            key={r.id}
            activeOpacity={0.9}
            style={[styles.recentThumb, { backgroundColor: r.color }]}
            onPress={() => Alert.alert('Recent background', 'Later: apply background image')}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsBlock: {
    marginTop: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  choosePhotoBtn: {
    height: 38,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  choosePhotoText: { color: PRIMARY_DARK, fontWeight: '900', fontSize: 13 },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#9CA3AF',
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 10,
  },
  recentsRow: { gap: 10, paddingVertical: 10 },
  recentThumb: { width: 44, height: 30, borderRadius: 8 },
});

