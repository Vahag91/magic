import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../../styles';

const PRIMARY = colors.blue500;
const TEXT = colors.text;

export default function BlurControls({ blurStrength, dimBackground, onBlurStrengthChange, onDimBackgroundChange }) {
  return (
    <View style={styles.controlsBlock}>
      <Text style={styles.controlTitle}>Blur Strength</Text>
      <View style={styles.sliderRow}>
        <Slider
          style={styles.sliderNative}
          minimumValue={0}
          maximumValue={100}
          value={blurStrength}
          onValueChange={onBlurStrengthChange}
          minimumTrackTintColor={PRIMARY}
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor={PRIMARY}
        />
        <Text style={styles.sliderValue}>{Math.round(blurStrength)}%</Text>
      </View>

      <Text style={[styles.controlTitle, styles.controlTitleSpacing]}>Dim Background</Text>
      <View style={styles.sliderRow}>
        <Slider
          style={styles.sliderNative}
          minimumValue={0}
          maximumValue={50}
          value={dimBackground}
          onValueChange={onDimBackgroundChange}
          minimumTrackTintColor={PRIMARY}
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor={PRIMARY}
        />
        <Text style={styles.sliderValue}>{Math.round(dimBackground)}%</Text>
      </View>
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
  controlTitle: { fontSize: 12, color: '#6B7280', fontWeight: '900', marginBottom: 6 },
  controlTitleSpacing: { marginTop: 12 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderNative: { flex: 1 },
  sliderValue: { width: 52, textAlign: 'right', fontSize: 12, fontWeight: '900', color: TEXT },
});

