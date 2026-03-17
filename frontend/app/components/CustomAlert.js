/**
 * Custom Alert Component - Reusable Alert Dialog
 * Author: Momna Butt (BCSF22M021)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, type, onClose, onConfirm }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-close logic for success type (optional, keep it flexible)
      if (type === 'success' && !onConfirm) {
        const timer = setTimeout(() => {
          onClose();
        }, 2500);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, type, onClose, onConfirm, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const alertConfig = {
    success: {
      icon: 'checkmark-circle',
      color: '#4CAF50',
      buttonText: 'Great!',
    },
    error: {
      icon: 'close-circle',
      color: '#F44336',
      buttonText: 'Try Again',
    },
    confirm: {
      icon: 'help-circle',
      color: '#FF9800',
      buttonText: 'Confirm',
    },
    info: {
      icon: 'information-circle',
      color: '#2196F3',
      buttonText: 'Got it',
    },
    warning: {
      icon: 'alert-circle',
      color: '#FFC107',
      buttonText: 'OK',
    }
  };

  const config = alertConfig[type] || alertConfig.info;

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
            <Ionicons name={config.icon} size={50} color={config.color} />
          </View>
          
          <Text style={[styles.title, { color: '#333' }]}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonWrapper}>
            {type === 'confirm' ? (
              <View style={styles.rowButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: config.color }]} 
                  onPress={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>{config.buttonText}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: config.color, width: '100%' }]} 
                onPress={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>{config.buttonText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 340,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    marginBottom: 25,
  },
  buttonWrapper: {
    width: '100%',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CustomAlert;
