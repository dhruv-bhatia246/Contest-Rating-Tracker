import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Image, StyleSheet, Platform, View, Animated, ActivityIndicator } from 'react-native';
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
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

const config = {
  animation: 'spring',
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

const forFade = ({ current, next }) => {
  const opacity = Animated.add(
    current.progress,
    next ? next.progress : 0
  ).interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0],
  });

  return {
    leftButtonStyle: { opacity },
    rightButtonStyle: { opacity },
    titleStyle: { opacity },
    backgroundStyle: { opacity },
  };
};

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
);

export default function MainScreen() {
  const [cfusername, setCfUsername] = useState();
  const [ccusername, setCcUsername] = useState();
  const [lcusername, setLcUsername] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const Tab = createMaterialTopTabNavigator();

  // Load selected platforms from AsyncStorage
  useEffect(() => {
    const loadUsernames = async () => {
      try {
        const [storedLcUsername, storedCfUsername, storedCcUsername] = await Promise.all([
          AsyncStorage.getItem('lcusername'),
          AsyncStorage.getItem('cfusername'),
          AsyncStorage.getItem('ccusername')
        ]);
        
        // Only set usernames if they exist in storage
        if (storedLcUsername) {
          setLcUsername(storedLcUsername);
        } else {
          setLcUsername(undefined);
        }
        
        if (storedCfUsername) {
          setCfUsername(storedCfUsername);
        } else {
          setCfUsername(undefined);
        }
        
        if (storedCcUsername) {
          setCcUsername(storedCcUsername);
        } else {
          setCcUsername(undefined);
        }
      } catch (error) {
        console.error('Error loading usernames:', error);
        // Reset all usernames on error
        setLcUsername(undefined);
        setCfUsername(undefined);
        setCcUsername(undefined);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsernames();
  }, []);

  // Add effect to persist username changes to AsyncStorage
  useEffect(() => {
    const saveUsernames = async () => {
      try {
        // Handle lcusername
        if (lcusername) {
          await AsyncStorage.setItem('lcusername', lcusername);
        } else if (lcusername === undefined || lcusername === null) {
          await AsyncStorage.removeItem('lcusername');
        }

        // Handle cfusername
        if (cfusername) {
          await AsyncStorage.setItem('cfusername', cfusername);
        } else if (cfusername === undefined || cfusername === null) {
          await AsyncStorage.removeItem('cfusername');
        }

        // Handle ccusername
        if (ccusername) {
          await AsyncStorage.setItem('ccusername', ccusername);
        } else if (ccusername === undefined || ccusername === null) {
          await AsyncStorage.removeItem('ccusername');
        }
      } catch (error) {
        console.error('Error saving usernames:', error);
      }
    };
    saveUsernames();
  }, [lcusername, cfusername, ccusername]);

  const TabNavigator = () => {
    const insets = useSafeAreaInsets();
    
    return (
      <View style={styles.container}>
        <Tab.Navigator
          style={{ marginTop: insets.top }}
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
              height: 45,
              paddingBottom: 0,
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
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#1A1B1E" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { 
              backgroundColor: '#1A1B1E',
            },
            animation: 'fade',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            transitionSpec: {
              open: config,
              close: config,
            },
            cardStyleInterpolator: forFade,
          }}
        >
          {isLoading ? (
            <Stack.Screen 
              name="Loading" 
              component={LoadingScreen}
            />
          ) : (!lcusername && !cfusername && !ccusername) ? (
            <Stack.Screen 
              name="Entry" 
              options={{ headerShown: false }}
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
          ) : (
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ 
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#1A1B1E',
                }
              }}
            />
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1B1E',
  },
  iconStyle: {
    width: 22,
    height: 22,
    tintColor: '#fff'
  },
});