import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common } from '../../../styles';

const MAX_WIDTH = 430;
const SIDE_PADDING = 18;

export default function OnboardingHeader({
  canGoBack,
  onBack,
  textColor = '#111827',
  onLayout,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View onLayout={onLayout} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          {canGoBack ? (
            <Pressable onPress={onBack} hitSlop={10} style={styles.headerBtn}>
              <Text style={[styles.backIcon, { color: textColor }]}>{'‹'}</Text>
            </Pressable>
          ) : (
            <View style={styles.headerBtn} />
          )}

          <View style={styles.centerSpacer} />

          <View style={styles.headerBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingBottom: 8,
  },
  content: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE_PADDING,
  },
  header: common.header,
  headerBtn: common.headerBtn,
  centerSpacer: { flex: 1 },
  backIcon: {
    fontSize: 28,
  },
});
