import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import ArrowLeftIcon from '../../components/icons/ArrowLeftIcon';
import { styles } from './styles';

const Header = ({ onBack, onSave }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerIconBtn}>
        <ArrowLeftIcon size={20} color="#6B7280" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Skia Editor</Text>
      <TouchableOpacity onPress={onSave} style={styles.headerBtnPrimary}>
        <Text style={styles.headerBtnTextPrimary}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Header;
