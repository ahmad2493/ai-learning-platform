import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomAlert = ({ visible, title, message, type, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();

      if (type === 'success') {
        const timer = setTimeout(() => {
          onClose();
        }, 2500);
        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, type, onClose, scaleAnim]);

  if (!visible) return null;

  const isSuccess = type === 'success';
  const iconName = isSuccess ? 'checkmark-done-circle' : 'alert-circle-outline';
  const iconColor = isSuccess ? '#4CAF50' : '#F44336';

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name={iconName} size={isSuccess ? 50 : 40} color={iconColor} style={{ marginBottom: 15 }} />
          <Text style={styles.title}>{title}</Text>
          {!isSuccess ? (
            <>
              <Text style={styles.message}>{message}</Text>
              <TouchableOpacity style={[styles.button, { backgroundColor: iconColor }]} onPress={onClose}>
                <Text style={styles.buttonText}>OK</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: '85%',
    maxWidth: 300,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
    color: '#333',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomAlert;
