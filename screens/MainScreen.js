import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Image, StyleSheet, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LeetcodeScreen } from './LeetcodeScreen';
import { CodeforcesScreen } from './CodeforcesScreen';
import { SettingsScreen } from './SettingsScreen';
import leetcodeIcon from '../assets/leetcode.png';
import codeforces from '../assets/codeforces.png';
import codechef from '../assets/codechef.png';
import setting from '../assets/setting.png';
import trophy from '../assets/trophy.png';
import { ContestScreen } from './ContestsScreen';
import { BlurView } from '@react-native-community/blur';
import { CodechefScreen } from './CodechefScreen';
import { EntryScreen } from './EntryScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function MainScreen() {
  const [cfusername, setCfUsername] = useState();
  const [ccusername, setCcUsername] = useState();
  const [lcusername, setLcUsername] = useState();
  const Tab = createMaterialTopTabNavigator();
  const Stack = createNativeStackNavigator();

  // Load selected platforms from AsyncStorage
  useEffect(() => {
    const loadUsernames = async () => {
      const storedLcUsername = await AsyncStorage.getItem('lcusername');
      const storedCfUsername = await AsyncStorage.getItem('cfusername');
      const storedCcUsername = await AsyncStorage.getItem('ccusername');
      
      if (storedLcUsername) setLcUsername(storedLcUsername);
      if (storedCfUsername) setCfUsername(storedCfUsername);
      if (storedCcUsername) setCcUsername(storedCcUsername);
    };
    loadUsernames();
  }, []);

  const TabNavigator = () => (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <View style={styles.statusBarFill} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: () => {
            let icon;
            if (route.name === 'LeetCode') {
              icon = leetcodeIcon;
            } else if (route.name === 'Codeforces') {
              icon = codeforces;
            } else if (route.name === 'Codechef') {
              icon = codechef;
            } else if (route.name === 'Contests') {
              icon = trophy;
            } else if (route.name === 'Settings') {
              icon = setting;
            }
            return (
              <Image
                source={icon}
                style={styles.iconStyle}
                resizeMode="contain"
              />
            );
          },
          tabBarShowLabel: false,
          tabBarBackground: () => (
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
            />
          ),
          tabBarStyle: {
            backgroundColor: '#2A2B2F',
            borderTopWidth: 0,
            elevation: 0,
            height: 60,
            marginTop: Platform.OS === 'ios' ? 50 : 0,
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#2563EB',
            height: 3,
          },
          style: {
            backgroundColor: '#1A1B1E',
          },
        })}
      >
        {lcusername && (
          <Tab.Screen 
            name="LeetCode" 
            children={({ navigation }) => (
              <LeetcodeScreen 
                navigation={navigation}
                lcusername={lcusername} 
                setLcUsername={setLcUsername} 
              />
            )} 
          />
        )}
        {cfusername && (
          <Tab.Screen 
            name="Codeforces" 
            children={({ navigation }) => (
              <CodeforcesScreen 
                navigation={navigation}
                cfusername={cfusername} 
                setCfUsername={setCfUsername} 
              />
            )} 
          />
        )}
        {ccusername && (
          <Tab.Screen 
            name="Codechef" 
            children={({ navigation }) => (
              <CodechefScreen 
                navigation={navigation}
                ccusername={ccusername} 
                setCcUsername={setCcUsername} 
              />
            )} 
          />
        )}
        {(lcusername || cfusername || ccusername) && (
          <>
            <Tab.Screen 
              name="Contests" 
              children={({ navigation }) => (
                <ContestScreen 
                  navigation={navigation}
                  cfusername={cfusername} 
                  setCfUsername={setCfUsername} 
                  lcusername={lcusername} 
                  setLcUsername={setLcUsername} 
                />
              )} 
            />
            <Tab.Screen 
              name="Settings" 
              children={({ navigation }) => (
                <SettingsScreen 
                  navigation={navigation}
                  cfusername={cfusername} 
                  setCfUsername={setCfUsername} 
                  lcusername={lcusername} 
                  setLcUsername={setLcUsername} 
                  ccusername={ccusername} 
                  setCcUsername={setCcUsername}
                />
              )} 
            />
          </>
        )}
      </Tab.Navigator>
    </SafeAreaView>
  );

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#1A1B1E" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#1A1B1E' }
          }}
        >
          <Stack.Screen 
            name="Entry" 
            options={{ 
              headerShown: false
            }}
            children={({ navigation }) => (
              <EntryScreen
                navigation={navigation}
                cfusername={cfusername}
                setCfUsername={setCfUsername}
                lcusername={lcusername}
                setLcUsername={setLcUsername}
                ccusername={ccusername}
                setCcUsername={setCcUsername}
              />
            )}
          />
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ 
              headerShown: false
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B1E',
  },
  statusBarFill: {
    backgroundColor: '#1A1B1E',
    height: 0,
  },
  iconStyle: {
    width: 24,
    height: 24,
    tintColor: '#fff'
  },
});