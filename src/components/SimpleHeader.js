import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, common, fonts } from '../styles';

export default function SimpleHeader({ title, onBack, right }) {
  const rightNode = right ?? <View style={styles.headerBtn} />;

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerBtn} activeOpacity={0.8}>
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>{title}</Text>

      {rightNode}
    </View>
  );
}

const styles = StyleSheet.create({
  header: common.header,
  headerBtn: common.headerBtn,
  backIcon: {
    fontSize: 28,
    color: '#111',
    marginTop: Platform.select({ ios: -2, android: 0 }),
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.regular,
    fontWeight: '800',
    color: colors.text,
  },
});
