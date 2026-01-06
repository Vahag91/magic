import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../../styles';

const PRIMARY = colors.blue500;
const BG = colors.white;
const TEXT = colors.text;

export default function BackgroundEditorHeader({ onBack, onSave }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.85}>
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Edit Background</Text>

      <TouchableOpacity style={styles.saveBtn} onPress={onSave} activeOpacity={0.9}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 28, color: TEXT, marginTop: Platform.select({ ios: -2, android: 0 }) },
  headerTitle: { fontSize: 18, fontWeight: '900', color: TEXT },
  saveBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 3 },
    }),
  },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});

