/**
 * Dropdown Component - Reusable Dropdown Menu
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Displays dropdown menu with selectable options
 * - Shows selected value and placeholder
 * - Handles option selection and value changes
 * - Provides modal-based dropdown interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Dropdown({ options, selectedValue, onValueChange, placeholder, theme }) {
  const [modalVisible, setModalVisible] = useState(false);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.optionContainer} 
        onPress={() => {
            onValueChange(item);
            setModalVisible(false);
        }}
    >
        <Text style={{color: theme.text}}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View>
        <TouchableOpacity style={[styles.dropdown, {borderColor: theme.hairline}]} onPress={() => setModalVisible(true)}>
            <Text style={{color: selectedValue ? theme.text : '#888'}}>{selectedValue || placeholder}</Text>
            <Ionicons name="chevron-down-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        <Modal
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
            <View style={[styles.modalContent, {backgroundColor: theme.surface}]}>
                <FlatList
                    data={options}
                    renderItem={renderItem}
                    keyExtractor={(item) => item}
                />
            </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 5,
        padding: 15,
        marginBottom: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '50%'
    },
    optionContainer: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    }
});