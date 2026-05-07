import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LeetcodeScreen } from './LeetcodeScreen';
import { CodeforcesScreen } from './CodeforcesScreen';
import { CodechefScreen } from './CodechefScreen';
import { SettingsScreen } from './SettingsScreen';
import { ContestsScreen } from './ContestsScreen';
import { HomeScreen } from './HomeScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { useTheme } from '../ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

function RatingsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors, accent, mode } = useTheme();
  const initialTab = route?.params?.tab || null;
  const [enabledPlatforms, setEnabledPlatforms] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPlatformSettings = useCallback(async () => {
    const lc = await AsyncStorage.getItem('platform_leetcode');
    const cf = await AsyncStorage.getItem('platform_codeforces');
    const cc = await AsyncStorage.getItem('platform_codechef');
    setEnabledPlatforms({
      leetcode: lc !== 'false',
      codeforces: cf !== 'false',
      codechef: cc !== 'false',
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlatformSettings();
    const interval = setInterval(loadPlatformSettings, 2000);
    return () => clearInterval(interval);
  }, [loadPlatformSettings]);

  const enabledCount = enabledPlatforms ? Object.values(enabledPlatforms).filter(Boolean).length : 0;

  if (loading || !enabledPlatforms) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 8, borderRadius: 10, backgroundColor: colors.card, marginRight: 12 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: 0.5 }}>
              Platforms
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: 10, borderRadius: 12, backgroundColor: accent + '22' }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      {enabledCount === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Ionicons name="toggle-outline" size={48} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12, textAlign: 'center' }}>
            No platforms enabled. Go to Settings to enable at least one.
          </Text>
        </View>
      ) : (
        <Tab.Navigator
          key={initialTab || 'default'}
          initialRouteName={initialTab || undefined}
          screenOptions={{
            tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
            tabBarActiveTintColor: accent,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: {
              backgroundColor: colors.background,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            },
            tabBarIndicatorStyle: { backgroundColor: accent, height: 3, borderRadius: 2 },
            tabBarItemStyle: { paddingHorizontal: 4 },
            lazy: true,
            lazyPlaceholder: () => <View style={{ flex: 1, backgroundColor: colors.background }} />, 
            sceneStyle: { backgroundColor: colors.background },
            swipeEnabled: true,
          }}
        >
          {enabledPlatforms.leetcode && <Tab.Screen name="LeetCode" component={LeetcodeScreen} />}
          {enabledPlatforms.codeforces && <Tab.Screen name="Codeforces" component={CodeforcesScreen} />}
          {enabledPlatforms.codechef && <Tab.Screen name="CodeChef" component={CodechefScreen} />}
          <Tab.Screen name="Contests" component={ContestsScreen} />
        </Tab.Navigator>
      )}
    </View>
  );
}

export default function MainScreen() {
  const { mode, colors } = useTheme();
  const [onboarded, setOnboarded] = useState(null); // null = loading, true/false

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then(val => {
      setOnboarded(val === 'true');
    });
  }, []);

  if (onboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!onboarded) {
    return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Home" component={HomeWrapper} />
        <Stack.Screen name="Ratings" component={RatingsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HomeWrapper({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, accent } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '700', letterSpacing: 0.5 }}>
              Rating Tracker
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
              Track your competitive programming progress
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: 10, borderRadius: 12, backgroundColor: accent + '22' }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      <HomeScreen navigation={navigation} />
    </View>
  );
}