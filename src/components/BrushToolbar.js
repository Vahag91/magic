import * as React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../styles';

const PRIMARY = colors.brandBlue || '#2563EB';
const TEXT = colors.text || '#111827';
const SUB = colors.muted || '#6B7280';
const BORDER = colors.border || '#E5E7EB';

function ToolButton({ label, active, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.toolBtn,
        active && styles.toolBtnActive,
        disabled && { opacity: 0.5 },
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.toolBtnText, active && styles.toolBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.actionBtn, disabled && { opacity: 0.45 }, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export default function BrushToolbar({
  mode,
  onModeChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onReset,
  onSubmit,
  isWorking,
  canUndo,
  canRedo,
  canSubmit,
  bottomInset = 0,
}) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <View style={styles.rowTop}>
        <ToolButton
          label="Brush"
          active={mode === 'draw'}
          disabled={isWorking}
          onPress={() => onModeChange?.('draw')}
        />
        <ToolButton
          label="Eraser"
          active={mode === 'erase'}
          disabled={isWorking}
          onPress={() => onModeChange?.('erase')}
        />

        <View style={{ flex: 1 }} />

        <ActionButton label="Undo" onPress={onUndo} disabled={isWorking || !canUndo} />
        <ActionButton label="Redo" onPress={onRedo} disabled={isWorking || !canRedo} />
        <ActionButton label="Reset" onPress={onReset} disabled={isWorking} />
      </View>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>Brush size</Text>
        <Slider
          style={styles.slider}
          value={brushSize}
          minimumValue={6}
          maximumValue={60}
          step={1}
          minimumTrackTintColor={PRIMARY}
          maximumTrackTintColor="#D1D5DB"
          thumbTintColor={PRIMARY}
          onValueChange={onBrushSizeChange}
          disabled={isWorking}
        />
        <Text style={styles.sizePill}>{Math.round(Number(brushSize) || 0)}</Text>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={isWorking || !canSubmit}
        style={({ pressed }) => [
          styles.submitBtn,
          (isWorking || !canSubmit) && { opacity: 0.5 },
          pressed && !isWorking && canSubmit && styles.submitPressed,
        ]}
      >
        <Text style={styles.submitText}>{isWorking ? 'Working…' : 'Remove Object'}</Text>
      </Pressable>

      {!canSubmit ? (
        <Text style={styles.hint}>Paint over the object you want to remove.</Text>
      ) : (
        <Text style={styles.hint}>White = remove. Black = keep.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#fff',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  toolBtnText: { fontWeight: '800', color: TEXT, fontSize: 13 },
  toolBtnTextActive: { color: PRIMARY },
  actionBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  actionText: { color: TEXT, fontWeight: '800', fontSize: 12 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  sliderLabel: { width: 78, color: SUB, fontWeight: '800', fontSize: 12 },
  slider: { flex: 1, height: 30 },
  sizePill: {
    minWidth: 38,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  submitBtn: {
    marginTop: 12,
    height: 52,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },
  hint: { marginTop: 8, color: SUB, fontSize: 12, fontWeight: '700' },
});

