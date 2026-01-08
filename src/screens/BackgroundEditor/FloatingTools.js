import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import ArrowLeftIcon from '../../components/icons/ArrowLeftIcon';
import ArrowRightOverlayIcon from '../../components/icons/ArrowRightOverlayIcon';
import { styles } from './styles';

const FloatingTools = ({ onUndo, onRedo, canUndo, canRedo }) => {
  return (
    <View style={styles.floatingTools}>
      <TouchableOpacity
        onPress={onUndo}
        disabled={!canUndo}
        style={[styles.circleBtn, { opacity: canUndo ? 1 : 0.5 }]}
      >
        <ArrowLeftIcon size={24} color="#000000" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onRedo}
        disabled={!canRedo}
        style={[styles.circleBtn, { opacity: canRedo ? 1 : 0.5 }]}
      >
        <ArrowRightOverlayIcon size={24} color="#000000" />
      </TouchableOpacity>
    </View>
  );
};

export default FloatingTools;
