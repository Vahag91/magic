import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { common } from '../styles';
import { SimpleHeader } from '../components';

export default function RemoveObjectSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <SimpleHeader title="Remove Object" onBack={() => navigation.goBack()} />

        <View style={styles.content} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: common.safeWhite,
  container: common.containerPadded,

  content: { flex: 1 },
});
