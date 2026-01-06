import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../styles';

const PRIMARY = colors.blue500;

export default function ModeChip({ icon, label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.modeChip}>
      <View style={[styles.modeIconBox, selected ? styles.modeIconBoxActive : null]}>
        <Text style={[styles.modeIcon, selected ? { color: PRIMARY } : { color: '#9CA3AF' }]}>{icon}</Text>
      </View>
      <Text style={[styles.modeLabel, selected ? { color: PRIMARY, fontWeight: '900' } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modeChip: { width: 74, alignItems: 'center' },
  modeIconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconBoxActive: {
    backgroundColor: '#EFF6FF',
    borderColor: PRIMARY,
  },
  modeIcon: { fontSize: 18 },
  modeLabel: { marginTop: 6, fontSize: 12, color: '#6B7280', fontWeight: '700' },
});

