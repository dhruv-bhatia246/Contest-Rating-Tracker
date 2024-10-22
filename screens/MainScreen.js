import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, Button, Platform, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LeetcodeScreen } from './LeetcodeScreen';
import { CodeforcesScreen } from './CodeforcesScreen';
import { SettingsScreen } from './SettingsScreen';
import { Avatar } from '@rneui/base';
import leetcodeIcon from '../assets/leetcode.png';
import leetcodehollow from '../assets/leetcode-hollow.png';
import codeforces from '../assets/codeforces.png';
import codeforcesHollow from '../assets/codeforces-hollow.png';
import setting from '../assets/setting.png';
import settingOutline from '../assets/setting-outline.png';
import trophy from '../assets/trophy.png';
import trophyHollow from '../assets/trophy-hollow.png';
import { AntDesign, SimpleLineIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContestScreen } from './ContestsScreen';

export default function MainScreen() {
  const [cfusername, setCfUsername] = useState();
  const [lcusername, setLcUsername] = useState();
  const Tab = createMaterialTopTabNavigator();
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="LeetCode"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'LeetCode') {
              if (focused)
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={leetcodeIcon} />;
              else
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={leetcodehollow} />;
            } else if (route.name === 'Codeforces') {
              if (focused)
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={codeforces} />;
              else
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={codeforcesHollow} />;
            } else if (route.name === 'Contests') {
              if (focused)
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={trophy} />;
              else
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={trophyHollow} />;
            } else if (route.name === 'Settings') {
              if (focused)
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={setting} />;
              else
                return <Image style={{ width: 20, height: 20, color: 'white' }} source={settingOutline} />;
            }

          },
          "tabBarLabelStyle": {
            color: "white",
            fontSize: 9,
            fontWeight: "bold",
            width: 100
          },
          "tabBarStyle": {
            backgroundColor: "orange",
            marginTop: Platform.OS === "ios" ? 47 : 0,
            height: 63,
            borderRadius: 15,
            position: 'absolute',
            left: 20,
            bottom: 25,
            right: 20,
            elevation: 0,
            ...styles.shadow
          },
          "tabBarIndicatorStyle": {
            width: 0, height: 0, elevation: 0
          }
        })}
      >
        <Tab.Screen name="LeetCode" children={() => <LeetcodeScreen lcusername={lcusername} setLcUsername={setLcUsername} />} />
        <Tab.Screen name="Codeforces" children={() => <CodeforcesScreen cfusername={cfusername} setCfUsername={setCfUsername} />} />
        <Tab.Screen name="Contests" children={() => <ContestScreen cfusername={cfusername} setCfUsername={setCfUsername} lcusername={lcusername} setLcUsername={setLcUsername} />} />
        <Tab.Screen name="Settings" children={() => <SettingsScreen cfusername={cfusername} setCfUsername={setCfUsername} lcusername={lcusername} setLcUsername={setLcUsername} />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: 'orange',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 5
  }
})