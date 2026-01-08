import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { styles } from './styles';

const TextEditModal = ({ visible, initialText, onClose, onSave }) => {
  const [text, setText] = useState(initialText);
  useEffect(() => { setText(initialText); }, [initialText, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Text</Text>
          <TextInput
            style={styles.modalInput}
            value={text}
            onChangeText={setText}
            autoFocus
            multiline
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnCancel}>
              <Text style={styles.modalBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(text)} style={styles.modalBtnSave}>
              <Text style={styles.modalBtnTextSave}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default TextEditModal;
