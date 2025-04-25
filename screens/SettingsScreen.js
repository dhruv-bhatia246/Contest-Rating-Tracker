import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, TouchableOpacity, Linking, Alert, TextInput, Modal, Platform } from 'react-native'
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { version as appVersion } from '../package.json';

const NotificationTimeInput = ({ label, value, onChangeText, unit }) => (
  <View style={styles.notificationSetting}>
    <View style={styles.notificationIcon}>
      {unit === 'hours' ? (
        <Ionicons name="notifications" size={20} color="#F9FAFB" />
      ) : (
        <Ionicons name="time" size={20} color="#F9FAFB" />
      )}
    </View>
    <View style={styles.notificationContent}>
      <Text style={styles.notificationTitle}>{label}</Text>
      <Text style={styles.notificationDescription}>
        Get notified {value} {unit} before contest
      </Text>
    </View>
    <View style={styles.timeInputContainer}>
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => {
          const newValue = Math.max(1, parseInt(value) - (unit === 'hours' ? 1 : 5));
          onChangeText(newValue.toString());
        }}
      >
        <Text style={styles.timeButtonText}>-</Text>
      </TouchableOpacity>
      <View style={styles.timeDisplay}>
        <Text style={styles.timeValue}>{value}</Text>
        <Text style={styles.timeUnit}>{unit}</Text>
      </View>
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => {
          const newValue = Math.min(unit === 'hours' ? 72 : 120, parseInt(value) + (unit === 'hours' ? 1 : 5));
          onChangeText(newValue.toString());
        }}
      >
        <Text style={styles.timeButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const AddAccountModal = ({ visible, platform, onClose, onSubmit }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = () => {
    if (username.trim()) {
      onSubmit(username.trim());
      setUsername('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add {platform} Account</Text>
          <TextInput
            style={styles.modalInput}
            placeholder={`Enter your ${platform} username`}
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonCancel]} 
              onPress={() => {
                setUsername('');
                onClose();
              }}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonSubmit]}
              onPress={handleSubmit}
            >
              <Text style={styles.modalButtonTextSubmit}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const SettingsScreen = ({ navigation, lcusername, setLcUsername, cfusername, setCfUsername, ccusername, setCcUsername }) => {
  const [notifyUpcoming, setNotifyUpcoming] = useState(true);
  const [notifyStarting, setNotifyStarting] = useState(true);
  const [showFinished, setShowFinished] = useState(false);
  const [upcomingNotificationTime, setUpcomingNotificationTime] = useState('24');
  const [startingNotificationTime, setStartingNotificationTime] = useState('30');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifyUpcomingSetting = await AsyncStorage.getItem('notifyUpcoming');
      const notifyStartingSetting = await AsyncStorage.getItem('notifyStarting');
      const showFinishedSetting = await AsyncStorage.getItem('showFinished');
      const upcomingTimeSetting = await AsyncStorage.getItem('upcomingNotificationTime');
      const startingTimeSetting = await AsyncStorage.getItem('startingNotificationTime');

      setNotifyUpcoming(notifyUpcomingSetting !== 'false');
      setNotifyStarting(notifyStartingSetting !== 'false');
      setShowFinished(showFinishedSetting === 'true');
      setUpcomingNotificationTime(upcomingTimeSetting || '24');
      setStartingNotificationTime(startingTimeSetting || '30');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const saveNotificationTime = async (type, value) => {
    try {
      if (type === 'upcoming') {
        await AsyncStorage.setItem('upcomingNotificationTime', value);
        setUpcomingNotificationTime(value);
      } else {
        await AsyncStorage.setItem('startingNotificationTime', value);
        setStartingNotificationTime(value);
      }
    } catch (error) {
      console.error('Error saving notification time:', error);
    }
  };

  const handleDeleteAccount = (platform, username, setUsername) => {
    Alert.alert(
      `Remove ${platform} Account`,
      `Are you sure you want to remove your ${platform} account (${username})?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          onPress: async () => {
            try {
              // Remove from AsyncStorage
              await AsyncStorage.removeItem(`${platform.toLowerCase()}username`);
              // Update state
              setUsername(undefined);
            } catch (error) {
              console.error('Error removing account:', error);
              Alert.alert('Error', 'Failed to remove account. Please try again.');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const openPlatformProfile = (platform, username) => {
    const urls = {
      LeetCode: `https://leetcode.com/${username}`,
      Codeforces: `https://codeforces.com/profile/${username}`,
      Codechef: `https://www.codechef.com/users/${username}`
    };
    
    Linking.openURL(urls[platform]).catch((err) => 
      Alert.alert('Error', 'Could not open profile')
    );
  };

  const handleAddAccount = (platform) => {
    setSelectedPlatform(platform);
    setModalVisible(true);
  };

  const handleSubmitUsername = async (username) => {
    try {
      const key = `${selectedPlatform.toLowerCase()}username`;
      
      // First update AsyncStorage
      await AsyncStorage.setItem(key, username);
      
      // Then update state based on platform
      switch (selectedPlatform) {
        case 'LeetCode':
          setLcUsername(username);
          break;
        case 'Codeforces':
          setCfUsername(username);
          break;
        case 'Codechef':
          setCcUsername(username);
          break;
      }
      
      setModalVisible(false);
      setSelectedPlatform(null);
    } catch (error) {
      console.error('Error saving username:', error);
      Alert.alert('Error', 'Failed to save username. Please try again.');
    }
  };

  const SettingSection = ({ title, children, style }) => (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const SettingRow = ({ icon, title, right, onPress }) => (
    <TouchableOpacity 
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        {icon}
        <Text style={styles.settingText}>{title}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <SettingSection title="Connected Accounts" style={styles.firstSection}>
          {!lcusername && (
            <SettingRow
              icon={<FontAwesome5 name="code" size={18} color="#F9FAFB" />}
              title="Add LeetCode Account"
              right={
                <TouchableOpacity 
                  onPress={() => handleAddAccount('LeetCode')}
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              }
            />
          )}
          {lcusername && (
            <SettingRow
              icon={<FontAwesome5 name="code" size={18} color="#F9FAFB" />}
              title={`LeetCode: ${lcusername}`}
              right={
                <View style={styles.accountActions}>
                  <TouchableOpacity 
                    onPress={() => openPlatformProfile('LeetCode', lcusername)}
                    style={styles.iconButton}
                  >
                    <FontAwesome5 name="external-link-alt" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteAccount('LeetCode', lcusername, setLcUsername)}
                    style={styles.iconButton}
                  >
                    <FontAwesome5 name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              }
            />
          )}
          {!cfusername && (
            <SettingRow
              icon={<FontAwesome5 name="code" size={18} color="#F9FAFB" />}
              title="Add Codeforces Account"
              right={
                <TouchableOpacity 
                  onPress={() => handleAddAccount('Codeforces')}
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              }
            />
          )}
          {cfusername && (
            <SettingRow
              icon={<FontAwesome5 name="code" size={18} color="#F9FAFB" />}
              title={`Codeforces: ${cfusername}`}
              right={
                <View style={styles.accountActions}>
                  <TouchableOpacity 
                    onPress={() => openPlatformProfile('Codeforces', cfusername)}
                    style={styles.iconButton}
                  >
                    <FontAwesome5 name="external-link-alt" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteAccount('Codeforces', cfusername, setCfUsername)}
                    style={styles.iconButton}
                  >
                    <FontAwesome5 name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              }
            />
          )}
          {!ccusername && (
            <SettingRow
              icon={<FontAwesome5 name="code" size={18} color="#F9FAFB" />}
              title="Add Codechef Account"
              right={
                <TouchableOpacity 
                  onPress={() => handleAddAccount('Codechef')}
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              }
            />
          )}
          {ccusername && (
            <SettingRow
              icon={<FontAwesome5 name="code" size={18} color="#F9FAFB" />}
              title={`Codechef: ${ccusername}`}
              right={
                <View style={styles.accountActions}>
                  <TouchableOpacity 
                    onPress={() => openPlatformProfile('Codechef', ccusername)}
                    style={styles.iconButton}
                  >
                    <FontAwesome5 name="external-link-alt" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteAccount('Codechef', ccusername, setCcUsername)}
                    style={styles.iconButton}
                  >
                    <FontAwesome5 name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </SettingSection>

        <SettingSection title="Notifications">
          <View style={styles.notificationContainer}>
            <View style={styles.notificationHeader}>
              <Ionicons name="notifications" size={20} color="#F9FAFB" />
              <Text style={styles.notificationHeaderText}>Upcoming Contests</Text>
              <Switch
                value={notifyUpcoming}
                onValueChange={(value) => {
                  setNotifyUpcoming(value);
                  updateSetting('notifyUpcoming', value);
                }}
                trackColor={{ false: '#374151', true: '#2563EB' }}
                thumbColor={notifyUpcoming ? '#F9FAFB' : '#9CA3AF'}
              />
            </View>
            {notifyUpcoming && (
              <NotificationTimeInput
                label="Upcoming Contest"
                value={upcomingNotificationTime}
                onChangeText={(value) => saveNotificationTime('upcoming', value)}
                unit="hours"
              />
            )}
          </View>

          <View style={styles.notificationContainer}>
            <View style={styles.notificationHeader}>
              <Ionicons name="time" size={20} color="#F9FAFB" />
              <Text style={styles.notificationHeaderText}>Contest Starting</Text>
              <Switch
                value={notifyStarting}
                onValueChange={(value) => {
                  setNotifyStarting(value);
                  updateSetting('notifyStarting', value);
                }}
                trackColor={{ false: '#374151', true: '#2563EB' }}
                thumbColor={notifyStarting ? '#F9FAFB' : '#9CA3AF'}
              />
            </View>
            {notifyStarting && (
              <NotificationTimeInput
                label="Contest Starting"
                value={startingNotificationTime}
                onChangeText={(value) => saveNotificationTime('starting', value)}
                unit="minutes"
              />
            )}
          </View>
        </SettingSection>

        <SettingSection title="Display">
          <SettingRow
            icon={<MaterialIcons name="history" size={18} color="#F9FAFB" />}
            title="Show Finished Contests"
            right={
              <Switch
                value={showFinished}
                onValueChange={(value) => {
                  setShowFinished(value);
                  updateSetting('showFinished', value);
                }}
                trackColor={{ false: "#4B5563", true: "#2563EB" }}
                thumbColor={showFinished ? "#F9FAFB" : "#9CA3AF"}
              />
            }
          />
        </SettingSection>

        <SettingSection title="About">
          <SettingRow
            icon={<Ionicons name="information-circle" size={18} color="#F9FAFB" />}
            title="Version"
            right={<Text style={styles.versionText}>{appVersion}</Text>}
          />
        </SettingSection>
      </ScrollView>
      <AddAccountModal
        visible={modalVisible}
        platform={selectedPlatform}
        onClose={() => {
          setModalVisible(false);
          setSelectedPlatform(null);
        }}
        onSubmit={handleSubmitUsername}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B1E',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  firstSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#2A2B2F',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#F9FAFB',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  versionText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingTextContainer: {
    flexDirection: 'column',
  },
  settingDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  notificationContainer: {
    backgroundColor: '#2A2B2F',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  notificationHeaderText: {
    flex: 1,
    fontSize: 16,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  notificationSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#F9FAFB',
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 4,
  },
  timeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  timeButtonText: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: '600',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 16,
    color: '#F9FAFB',
    fontWeight: '600',
    marginRight: 4,
  },
  timeUnit: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2B2F',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#374151',
  },
  modalButtonSubmit: {
    backgroundColor: '#2563EB',
  },
  modalButtonTextCancel: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonTextSubmit: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
  },
});