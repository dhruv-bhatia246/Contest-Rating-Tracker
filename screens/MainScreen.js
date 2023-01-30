import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, Button, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LeetcodeScreen } from './LeetcodeScreen';
import { CodeforcesScreen } from './CodeforcesScreen';

function SettingsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Settings!</Text>
    </View>
  );
}

export default function MainScreen() {
  const Tab = createMaterialTopTabNavigator();
  const insets = useSafeAreaInsets();
  const [lcUserName, setLcUserName] = useState();
  const [cfUserName, setCfUserName] = useState();

  useEffect(() => {
    if (localStorage.getItem("lcUserName"))
      setLcUserName(localStorage.getItem("lcUserName"));

    if (localStorage.getItem("lcUserName"))
      setCfUserName(localStorage.getItem("cfUserName"));
  }, [])

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Codeforces"
        screenOptions={{
          "tabBarLabelStyle": {
            "color": "white",
            "fontSize": 14,
            "fontWeight": "bold"
          },
          "tabBarStyle": {
            "backgroundColor": "#1b1b21",
            "marginTop": Platform.OS === "ios" ? 47 : 0
          }
        }}
      >
        <Tab.Screen name="Codeforces" component={CodeforcesScreen} />
        <Tab.Screen name="LeetCode" component={LeetcodeScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}