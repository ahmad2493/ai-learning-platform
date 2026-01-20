import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import Sidebar from "./SidebarComponent";
import { termsAndConditionsText } from "../constants/legalText";

export default function AboutAppScreen({ navigation }) {
  const { theme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleTermsPress = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>About App</Text>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* App Information */}
          <View style={styles.optionsContainer}>
            {/* App Version */}
            <View style={[styles.optionCard, { backgroundColor: theme.surface }]}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="lock-closed" size={24} color={theme.primary} />
              </View>
              <View style={styles.versionContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>App version</Text>
                <Text style={[styles.versionText, { color: theme.text }]}>1.5.0</Text>
              </View>
            </View>

            {/* Terms & Conditions */}
            <TouchableOpacity onPress={handleTermsPress} activeOpacity={0.7}>
              <View style={[styles.optionCard, { backgroundColor: theme.surface }]}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="document-text" size={24} color={theme.primary} />
                </View>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Terms & Conditions</Text>
                <Ionicons name="chevron-forward" size={24} color={theme.text} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <Sidebar isVisible={sidebarVisible} onClose={toggleSidebar} activeScreen="AboutApp" />

      {/* Terms and Conditions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Terms & Conditions</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close-circle" size={30} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.modalText, { color: theme.text }]}>{termsAndConditionsText}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.primary }]} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Accept & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingRight: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    marginRight: 15,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  versionContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  versionText: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalScrollView: {
    marginVertical: 10,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
  closeButton: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});