import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../styles';
import { PALETTE } from './constants';

const PRIMARY = colors.blue500;
const BORDER = colors.border;

export default function ColorPalette({ selectedColor, onColorSelect, onPickerPress }) {
  return (
    <View style={styles.paletteSection}>
      <View style={styles.paletteHeader}>
        <Text style={styles.sectionLabel}>PALETTE</Text>
        <TouchableOpacity onPress={onPickerPress} activeOpacity={0.85}>
          <Text style={styles.pickerText}>Picker</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.paletteGrid}>
        {PALETTE.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.swatch,
              { backgroundColor: c },
              c === '#FFFFFF' ? { borderWidth: 1, borderColor: BORDER } : null,
            ]}
            activeOpacity={0.9}
            onPress={() => onColorSelect(c)}
          >
            {selectedColor === c ? (
              <View style={styles.checkWrap}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}

        {/* plus */}
        <TouchableOpacity
          style={[styles.swatch, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: BORDER }]}
          activeOpacity={0.9}
          onPress={() => Alert.alert('Add', 'Later: save custom colors')}
        >
          <Text style={styles.swatchPlus}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paletteSection: { marginTop: 10 },
  paletteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#9CA3AF',
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 10,
  },
  pickerText: { color: PRIMARY, fontWeight: '900', fontSize: 12 },
  paletteGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: PRIMARY, fontWeight: '900' },
  swatchPlus: { color: '#9CA3AF', fontSize: 18, fontWeight: '900' },
});

