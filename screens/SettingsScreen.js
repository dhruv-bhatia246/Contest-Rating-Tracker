import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Dimensions, Linking, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';

const screenWidth = Dimensions.get("window").width;

const PLATFORMS = [
  { key: 'leetcode', label: 'LeetCode', icon: 'code-slash', color: '#FFA116', storageKey: 'lcusername', enableKey: 'platform_leetcode' },
  { key: 'codeforces', label: 'Codeforces', icon: 'globe-outline', color: '#4fc3f7', storageKey: 'cfusername', enableKey: 'platform_codeforces' },
  { key: 'codechef', label: 'CodeChef', icon: 'restaurant-outline', color: '#66bb6a', storageKey: 'ccusername', enableKey: 'platform_codechef' },
];

const REMINDER_OPTIONS = [
  { key: '10', label: '10 minutes' },
  { key: '15', label: '15 minutes' },
  { key: '30', label: '30 minutes' },
  { key: '60', label: '1 hour' },
  { key: '120', label: '2 hours' },
  { key: '1440', label: '1 day' },
];

export const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const [usernames, setUsernames] = useState({});
  const [enabledPlatforms, setEnabledPlatforms] = useState({});
  const [reminderMinutes, setReminderMinutes] = useState('30');
  const [usernameModal, setUsernameModal] = useState(null); // platform object or null
  const [usernameInput, setUsernameInput] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const names = {};
    const enabled = {};
    for (const p of PLATFORMS) {
      names[p.key] = await AsyncStorage.getItem(p.storageKey);
      const val = await AsyncStorage.getItem(p.enableKey);
      enabled[p.key] = val !== 'false';
    }
    setUsernames(names);
    setEnabledPlatforms(enabled);
    const savedReminder = await AsyncStorage.getItem('reminder_minutes');
    if (savedReminder) setReminderMinutes(savedReminder);
  };

  const togglePlatform = async (platform) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = !enabledPlatforms[platform.key];
    if (newVal && !usernames[platform.key]) {
      // Enabling a platform without a username — show input modal
      setUsernameInput('');
      setUsernameModal(platform);
      return;
    }
    setEnabledPlatforms(prev => ({ ...prev, [platform.key]: newVal }));
    await AsyncStorage.setItem(platform.enableKey, String(newVal));
  };

  const validateUsername = async (platform, username) => {
    if (platform.key === 'leetcode') {
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `{ matchedUser(username: "${username}") { username } }` }),
      });
      const json = await res.json();
      return !!json?.data?.matchedUser;
    }
    if (platform.key === 'codeforces') {
      const res = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
      const json = await res.json();
      return json?.status === 'OK';
    }
    if (platform.key === 'codechef') {
      const res = await fetch(`https://www.codechef.com/users/${username}`);
      return res.ok;
    }
    return true;
  };

  const handleUsernameSubmit = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed || !usernameModal) return;
    setValidating(true);
    try {
      const valid = await validateUsername(usernameModal, trimmed);
      if (!valid) {
        Alert.alert('Invalid Username', `"${trimmed}" was not found on ${usernameModal.label}. Please check and try again.`);
        return;
      }
      await AsyncStorage.setItem(usernameModal.storageKey, trimmed);
      await AsyncStorage.setItem(usernameModal.enableKey, 'true');
      setUsernames(prev => ({ ...prev, [usernameModal.key]: trimmed }));
      setEnabledPlatforms(prev => ({ ...prev, [usernameModal.key]: true }));
      setUsernameModal(null);
      setUsernameInput('');
    } catch (e) {
      Alert.alert('Error', 'Could not validate username. Check your network and try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleUsernameCancel = () => {
    setUsernameModal(null);
    setUsernameInput('');
  };

  const resetUsername = (platform) => {
    Alert.alert(
      'Reset Username',
      `Remove your ${platform.label} username? You'll be asked to enter it again next time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await AsyncStorage.removeItem(platform.storageKey);
            const cacheKeys = { leetcode: 'cache_lc', codeforces: 'cache_cf', codechef: 'cache_cc' };
            if (cacheKeys[platform.key]) {
              await AsyncStorage.removeItem(cacheKeys[platform.key]);
            }
            if (platform.key === 'codeforces') {
              await AsyncStorage.removeItem('cache_cf_info');
            }
            setUsernames(prev => ({ ...prev, [platform.key]: null }));
          },
        },
      ]
    );
  };

  const resetAllData = () => {
    Alert.alert(
      'Reset All Data',
      'This will remove all saved usernames and settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.clear();
            setUsernames({});
            setEnabledPlatforms({ leetcode: true, codeforces: true, codechef: true });
            setReminderMinutes('30');
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}> 
      {/* Username Input Modal */}
      <Modal visible={!!usernameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{usernameModal?.label} Username</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter your username to enable this platform</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder={`Enter ${usernameModal?.label || ''} username`}
              placeholderTextColor={colors.textSecondary}
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.surface }]} onPress={handleUsernameCancel} disabled={validating}>
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleUsernameSubmit} disabled={validating}>
                {validating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.card }]}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Support Us */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>
        <TouchableOpacity
          style={[styles.supportCard, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '40' }]}
          onPress={() => Linking.openURL('https://paywitchai.in/dhruvbhatia')}
        >
          <View style={styles.supportLeft}>
            <Ionicons name="heart" size={22} color={colors.accent} />
            <View style={{ marginLeft: 14 }}>
              <Text style={[styles.platformName, { color: colors.textPrimary }]}>Support Us</Text>
              <Text style={[styles.platformUsername, { color: colors.textSecondary }]}>Pay with chai 🍵</Text>
            </View>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.accent} />
        </TouchableOpacity>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
          <View style={styles.platformRow}>
            <View style={styles.platformLeft}>
              <View style={[styles.platformIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.accent} />
              </View>
              <View style={styles.platformInfo}>
                <Text style={[styles.platformName, { color: colors.textPrimary }]}>Dark Mode</Text>
                <Text style={[styles.platformUsername, { color: colors.textSecondary }]}>
                  {mode === 'dark' ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode(mode === 'dark' ? 'light' : 'dark'); }}
              trackColor={{ false: colors.surface, true: colors.accent + '40' }}
              thumbColor={mode === 'dark' ? colors.accent : colors.textSecondary}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
          <View style={styles.platformRow}>
            <View style={styles.platformLeft}>
              <View style={[styles.platformIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="notifications-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.platformInfo}>
                <Text style={[styles.platformName, { color: colors.textPrimary }]}>Remind Before</Text>
                <Text style={[styles.platformUsername, { color: colors.textSecondary }]}>
                  {REMINDER_OPTIONS.find(o => o.key === reminderMinutes)?.label || '30 minutes'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.reminderOptions}>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setReminderMinutes(option.key);
                  await AsyncStorage.setItem('reminder_minutes', option.key);
                }}
                style={[
                  styles.reminderChip,
                  { backgroundColor: reminderMinutes === option.key ? colors.accent + '22' : colors.surface, borderColor: reminderMinutes === option.key ? colors.accent : colors.border },
                ]}
              >
                <Text style={[styles.reminderChipText, { color: reminderMinutes === option.key ? colors.accent : colors.textSecondary }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Platforms Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PLATFORMS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
          {PLATFORMS.map((platform, index) => (
            <View key={platform.key}>
              <View style={styles.platformRow}>
                <View style={styles.platformLeft}>
                  <View style={[styles.platformIcon, { backgroundColor: platform.color + '20' }]}>
                    <Ionicons name={platform.icon} size={20} color={platform.color} />
                  </View>
                  <View style={styles.platformInfo}>
                    <Text style={[styles.platformName, { color: colors.textPrimary }]}>{platform.label}</Text>
                    <Text style={[styles.platformUsername, { color: colors.textSecondary }]}>
                      {usernames[platform.key] || 'Not set'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={enabledPlatforms[platform.key]}
                  onValueChange={() => togglePlatform(platform)}
                  trackColor={{ false: colors.surface, true: colors.accent + '40' }}
                  thumbColor={enabledPlatforms[platform.key] ? colors.accent : colors.textSecondary}
                />
              </View>
              {index < PLATFORMS.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* Reset Usernames */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>USERNAMES</Text>
        <View style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
          {PLATFORMS.filter(p => enabledPlatforms[p.key]).map((platform, index, arr) => (
            <View key={platform.key}>
              <TouchableOpacity
                style={styles.resetRow}
                onPress={() => resetUsername(platform)}
                disabled={!usernames[platform.key]}
              >
                <View style={styles.resetLeft}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.resetLabel, { color: colors.textSecondary }]}>{platform.label}</Text>
                </View>
                <View style={styles.resetRight}>
                  <Text style={[styles.resetValue, { color: colors.textSecondary }, !usernames[platform.key] && { color: colors.border }]}>
                    {usernames[platform.key] || '—'}
                  </Text>
                  {usernames[platform.key] && (
                    <Ionicons name="close-circle" size={18} color="#ff5252" style={{ marginLeft: 8 }} />
                  )}
                </View>
              </TouchableOpacity>
              {index < arr.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA</Text>
        <TouchableOpacity style={[styles.dangerCard, { backgroundColor: colors.surface + 'dd', borderColor: colors.border }]} onPress={resetAllData}>
          <Ionicons name="trash-outline" size={20} color="#ff5252" />
          <Text style={styles.dangerText}>Reset All Data</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Rating Tracker v1.0.0</Text>
          <Text style={[styles.infoSubtext, { color: colors.textSecondary, opacity: 0.6 }]}>Track your competitive programming journey</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 8, marginLeft: 4 },
  card: { borderRadius: 16, padding: 16, marginBottom: 20 },
  platformRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  platformLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  platformIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  platformInfo: { marginLeft: 14 },
  platformName: { fontSize: 16, fontWeight: '600' },
  platformUsername: { fontSize: 13, marginTop: 2 },
  separator: { height: 1, marginVertical: 2 },
  resetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  resetLeft: { flexDirection: 'row', alignItems: 'center' },
  resetLabel: { fontSize: 15, marginLeft: 12 },
  resetRight: { flexDirection: 'row', alignItems: 'center' },
  resetValue: { fontSize: 14 },
  dangerCard: { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  dangerText: { color: '#ff5252', fontSize: 16, fontWeight: '600', marginLeft: 12 },
  infoSection: { alignItems: 'center', marginTop: 20, paddingBottom: 20, borderRadius: 16, padding: 20 },
  infoText: { fontSize: 14 },
  infoSubtext: { fontSize: 12, marginTop: 4 },
  supportCard: { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderWidth: 1 },
  supportLeft: { flexDirection: 'row', alignItems: 'center' },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4, paddingBottom: 8 },
  reminderChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  reminderChipText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '85%', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  modalInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalButtonText: { fontSize: 15, fontWeight: '600' },
});
