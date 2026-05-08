import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLATFORMS = [
  { key: 'leetcode', label: 'LeetCode', icon: 'code-slash', color: '#FFA116', storageKey: 'lcusername', enableKey: 'platform_leetcode' },
  { key: 'codeforces', label: 'Codeforces', icon: 'globe-outline', color: '#4fc3f7', storageKey: 'cfusername', enableKey: 'platform_codeforces' },
  { key: 'codechef', label: 'CodeChef', icon: 'restaurant-outline', color: '#66bb6a', storageKey: 'ccusername', enableKey: 'platform_codechef' },
];

export const OnboardingScreen = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const { colors, accent } = useTheme();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(0); // 0 = welcome, 1 = select platforms, 2 = enter usernames
  const [selectedPlatforms, setSelectedPlatforms] = useState({});
  const [usernames, setUsernames] = useState({});
  const [validating, setValidating] = useState(false);

  const togglePlatform = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlatforms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const goNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      const hasAny = Object.values(selectedPlatforms).some(Boolean);
      if (!hasAny) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      setStep(2);
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
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

  const handleFinish = async () => {
    setValidating(true);
    try {
      // Validate all usernames
      for (const p of enabledPlatforms) {
        const username = usernames[p.key]?.trim();
        if (username) {
          const valid = await validateUsername(p, username);
          if (!valid) {
            Alert.alert('Invalid Username', `"${username}" was not found on ${p.label}. Please check and try again.`);
            return;
          }
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      for (const p of PLATFORMS) {
        const enabled = !!selectedPlatforms[p.key];
        await AsyncStorage.setItem(p.enableKey, String(enabled));
        if (enabled && usernames[p.key]?.trim()) {
          await AsyncStorage.setItem(p.storageKey, usernames[p.key].trim());
        }
      }
      await AsyncStorage.setItem('onboarding_done', 'true');
      onComplete();
    } catch (e) {
      Alert.alert('Error', 'Could not validate usernames. Check your network and try again.');
    } finally {
      setValidating(false);
    }
  };

  const enabledPlatforms = PLATFORMS.filter(p => selectedPlatforms[p.key]);
  const hasAtLeastOne = enabledPlatforms.length > 0;
  const allUsernamesFilled = enabledPlatforms.every(p => usernames[p.key]?.trim());

  // Step 0: Welcome
  if (step === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <View style={[styles.iconCircle, { backgroundColor: accent + '20' }]}>
              <Ionicons name="trophy" size={56} color={accent} />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(600).delay(250)}>
            <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Rating Tracker</Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Track your competitive programming ratings across coding platforms all in one place.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.bottomAction}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accent }]} onPress={goNext}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // Step 1: Select Platforms
  if (step === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={goBack} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <View style={[styles.dotLine, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Which platforms do you use?</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Select the platforms you want to track. You can change this later in Settings.
            </Text>
          </Animated.View>

          {PLATFORMS.map((p, index) => {
            const selected = !!selectedPlatforms[p.key];
            return (
              <Animated.View key={p.key} entering={FadeInDown.duration(400).delay(150 + index * 100)}>
                <TouchableOpacity
                  style={[
                    styles.platformCard,
                    { backgroundColor: colors.card, borderColor: selected ? p.color : colors.border },
                    selected && { borderWidth: 2 },
                  ]}
                  onPress={() => togglePlatform(p.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.platformIconCircle, { backgroundColor: p.color + '20' }]}>
                    <Ionicons name={p.icon} size={24} color={p.color} />
                  </View>
                  <View style={styles.platformInfo}>
                    <Text style={[styles.platformLabel, { color: colors.textPrimary }]}>{p.label}</Text>
                  </View>
                  <View style={[styles.checkbox, { borderColor: selected ? p.color : colors.border, backgroundColor: selected ? p.color : 'transparent' }]}>
                    {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: hasAtLeastOne ? accent : colors.surface }]}
            onPress={goNext}
            disabled={!hasAtLeastOne}
          >
            <Text style={[styles.primaryButtonText, { color: hasAtLeastOne ? '#fff' : colors.textSecondary }]}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={hasAtLeastOne ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Enter Usernames
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={goBack} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <View style={[styles.dotLine, { backgroundColor: accent }]} />
          <View style={[styles.dot, { backgroundColor: accent }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Enter your usernames</Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            We'll use these to fetch your ratings and contest history.
          </Text>
        </Animated.View>

        {enabledPlatforms.map((p, index) => (
          <Animated.View key={p.key} entering={FadeInDown.duration(400).delay(150 + index * 100)}>
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputHeader}>
                <View style={[styles.platformIconCircle, { backgroundColor: p.color + '20' }]}>
                  <Ionicons name={p.icon} size={20} color={p.color} />
                </View>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{p.label}</Text>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder={`Enter ${p.label} username`}
                placeholderTextColor={colors.textSecondary}
                value={usernames[p.key] || ''}
                onChangeText={(text) => setUsernames(prev => ({ ...prev, [p.key]: text }))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: allUsernamesFilled && !validating ? accent : colors.surface }]}
          onPress={handleFinish}
          disabled={!allUsernamesFilled || validating}
        >
          {validating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={[styles.primaryButtonText, { color: allUsernamesFilled ? '#fff' : colors.textSecondary }]}>Finish Setup</Text>
              <Ionicons name="checkmark-circle" size={20} color={allUsernamesFilled ? '#fff' : colors.textSecondary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  welcomeTitle: { fontSize: 32, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  welcomeSubtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24 },
  bottomAction: { marginTop: 48, width: '100%' },

  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 32, height: 2, marginHorizontal: 6 },

  stepContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
  stepTitle: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  stepSubtitle: { fontSize: 15, lineHeight: 22, marginBottom: 28 },

  platformCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16,
    borderWidth: 1, marginBottom: 12,
  },
  platformIconCircle: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  platformInfo: { flex: 1, marginLeft: 14 },
  platformLabel: { fontSize: 17, fontWeight: '600' },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  inputCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 14 },
  inputHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  inputLabel: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  textInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },

  bottomBar: { paddingHorizontal: 20, paddingTop: 12 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 16, gap: 8,
  },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
