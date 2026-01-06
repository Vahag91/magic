import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../styles';

const PRIMARY = colors.blue500;

function SegmentButton({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.segmentBtn, selected ? styles.segmentBtnActive : null]}
    >
      <Text style={[styles.segmentText, selected ? styles.segmentTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
function PillAction({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.pill} activeOpacity={0.9} onPress={onPress}>
      <Text style={styles.pillText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SubjectControls({
  subjectTool,
  onToolChange,

  // optional (only show if both exist)
  subjectVariant, // 'original' | 'cutout'
  onVariantChange,
  canSwapVariant = false,

  // real actions
  onCenter,
  onFit,
  onReset,
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>SUBJECT</Text>

      {canSwapVariant ? (
        <View style={styles.subjectRow}>
          <SegmentButton
            label="Original"
            selected={subjectVariant === 'original'}
            onPress={() => onVariantChange && onVariantChange('original')}
          />
          <SegmentButton
            label="Cutout"
            selected={subjectVariant === 'cutout'}
            onPress={() => onVariantChange && onVariantChange('cutout')}
          />
        </View>
      ) : null}

      <View style={[styles.subjectRow, canSwapVariant ? { marginTop: 10 } : null]}>
        <SegmentButton
          label="Move"
          selected={subjectTool === 'move'}
          onPress={() => onToolChange('move')}
        />
        <SegmentButton
          label="Scale"
          selected={subjectTool === 'scale'}
          onPress={() => onToolChange('scale')}
        />
      </View>

      <View style={styles.subjectActions}>
        <PillAction label="Center" onPress={onCenter} />
        <PillAction label="Fit" onPress={onFit} />
        <PillAction label="Reset" onPress={onReset} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },

  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#9CA3AF',
    fontWeight: '900',
    marginBottom: 10,
  },

  subjectRow: { flexDirection: 'row', gap: 10 },

  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  segmentText: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  segmentTextActive: { color: PRIMARY, fontWeight: '900' },

  subjectActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },

  pill: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 12, fontWeight: '900', color: '#6B7280' },
});