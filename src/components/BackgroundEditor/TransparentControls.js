import * as React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { colors } from '../../styles';

const TEXT = colors.text;

export default function TransparentControls({ showCheckerboard, onToggleCheckerboard }) {
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlText}>Show checkerboard</Text>
      <Switch
        value={showCheckerboard}
        onValueChange={onToggleCheckerboard}
        trackColor={{ false: '#D1D5DB', true: '#A7C7FF' }}
        thumbColor={showCheckerboard ? colors.blue500 : '#F3F4F6'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  controlRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  controlText: { fontSize: 13, fontWeight: '800', color: TEXT },
});

