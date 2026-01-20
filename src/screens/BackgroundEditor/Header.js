import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './styles';

const Header = ({ onBack, onSave }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerIconBtn}>
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Skia Editor</Text>
      <TouchableOpacity onPress={onSave} style={styles.headerBtnPrimary}>
        <Text style={styles.headerBtnTextPrimary}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Header;
