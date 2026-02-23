/**
 * Custom Alert Component - Reusable Alert Dialog
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Displays custom alert dialogs with animations
 * - Supports different alert types (success, error, warning, info)
 * - Provides user-friendly notification system
 * - Handles modal display and dismissal
 */

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

const CustomAlert = ({ visible, title, message, type, onClose, onConfirm }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();

      // Auto-close only for success type
      if (type === 'success') {
        const timer = setTimeout(() => {
          onClose();
        }, 2500);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset animation when closing
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, type, onClose, scaleAnim]);

  if (!visible) return null;

  // Configuration for different alert types
  const alertConfig = {
    success: {
      icon: 'checkmark-done-circle',
      color: '#4CAF50',
      size: 50,
    },
    error: {
      icon: 'alert-circle-outline',
      color: '#F44336',
      size: 40,
    },
    confirm: {
      icon: 'help-circle-outline',
      color: '#FF9800', // Orange for confirmation
      size: 40,
    },
    info: {
      icon: 'information-circle-outline',
      color: '#2196F3',
      size: 40,
    },
  };

  const config = alertConfig[type] || alertConfig.error;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name={config.icon} size={config.size} color={config.color} style={{ marginBottom: 15 }} />
          <Text style={styles.title}>{title}</Text>
          
          {message && <Text style={styles.message}>{message}</Text>}

          {type === 'error' || type === 'info' ? (
            <TouchableOpacity style={[styles.button, { backgroundColor: config.color }]} onPress={onClose}>
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          ) : null}

          {type === 'confirm' ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: config.color }]} onPress={onConfirm}>
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 320,
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
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomAlert;
