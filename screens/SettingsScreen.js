import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, TouchableOpacity, Linking, Alert } from 'react-native'
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SettingsScreen = ({ navigation, lcusername, setLcUsername, cfusername, setCfUsername, ccusername, setCcUsername }) => {
  const [notifyUpcoming, setNotifyUpcoming] = useState(true);
  const [notifyStarting, setNotifyStarting] = useState(true);
  const [showFinished, setShowFinished] = useState(false);
  const appVersion = "1.0.0";

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifyUpcoming = await AsyncStorage.getItem('notifyUpcoming');
      const notifyStarting = await AsyncStorage.getItem('notifyStarting');
      const showFinished = await AsyncStorage.getItem('showFinished');
      
      setNotifyUpcoming(notifyUpcoming !== 'false');
      setNotifyStarting(notifyStarting !== 'false');
      setShowFinished(showFinished === 'true');
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
            await AsyncStorage.removeItem(`${platform.toLowerCase()}username`);
            setUsername(undefined);
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
          <SettingRow
            icon={<Ionicons name="notifications" size={18} color="#F9FAFB" />}
            title="Upcoming Contests"
            right={
              <Switch
                value={notifyUpcoming}
                onValueChange={(value) => {
                  setNotifyUpcoming(value);
                  updateSetting('notifyUpcoming', value);
                }}
                trackColor={{ false: "#4B5563", true: "#2563EB" }}
                thumbColor={notifyUpcoming ? "#F9FAFB" : "#9CA3AF"}
              />
            }
          />
          <SettingRow
            icon={<Ionicons name="time" size={18} color="#F9FAFB" />}
            title="Contest Starting Soon"
            right={
              <Switch
                value={notifyStarting}
                onValueChange={(value) => {
                  setNotifyStarting(value);
                  updateSetting('notifyStarting', value);
                }}
                trackColor={{ false: "#4B5563", true: "#2563EB" }}
                thumbColor={notifyStarting ? "#F9FAFB" : "#9CA3AF"}
              />
            }
          />
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
});