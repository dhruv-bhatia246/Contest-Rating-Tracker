import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Easing, StatusBar } from 'react-native';
import CheckBox from "expo-checkbox";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export const EntryScreen = ({ navigation, lcusername, setLcUsername, cfusername, setCfUsername, ccusername, setCcUsername }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    leetcode: false,
    codechef: false,
    codeforces: false,
  });
  
  // Add local state for usernames
  const [tempLcUsername, setTempLcUsername] = useState(lcusername || '');
  const [tempCcUsername, setTempCcUsername] = useState(ccusername || '');
  const [tempCfUsername, setTempCfUsername] = useState(cfusername || '');

  const leetcodeAnim = useRef(new Animated.Value(0)).current;
  const codechefAnim = useRef(new Animated.Value(0)).current;
  const codeforcesAnim = useRef(new Animated.Value(0)).current;

  const leetcodeScale = useRef(new Animated.Value(1)).current;
  const codechefScale = useRef(new Animated.Value(1)).current;
  const codeforcesScale = useRef(new Animated.Value(1)).current;

  // Add new animations for platform selection
  const platformsContainerAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Add reset function
  const resetState = () => {
    setSelectedPlatforms({
      leetcode: false,
      codechef: false,
      codeforces: false,
    });
    setTempLcUsername('');
    setTempCcUsername('');
    setTempCfUsername('');
  };

  // Reset state and trigger animations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      resetState();
      // Reset animations
      platformsContainerAnim.setValue(0);
      buttonAnim.setValue(0);
      leetcodeAnim.setValue(0);
      codechefAnim.setValue(0);
      codeforcesAnim.setValue(0);

      // Faster entry animations
      Animated.sequence([
        Animated.timing(platformsContainerAnim, {
          toValue: 1,
          duration: 400,
          delay: 50,
          useNativeDriver: true,
          easing: Easing.bezier(0.2, 0.65, 0.4, 0.9),
        }),
        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.bezier(0.2, 0.65, 0.4, 0.9),
        }),
      ]).start();
    }, [])
  );

  useEffect(() => {
    Animated.timing(leetcodeAnim, {
      toValue: selectedPlatforms.leetcode ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start();
  }, [selectedPlatforms.leetcode]);

  useEffect(() => {
    Animated.timing(codechefAnim, {
      toValue: selectedPlatforms.codechef ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start();
  }, [selectedPlatforms.codechef]);

  useEffect(() => {
    Animated.timing(codeforcesAnim, {
      toValue: selectedPlatforms.codeforces ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start();
  }, [selectedPlatforms.codeforces]);

  // Update platform selection animations
  const handlePlatformSelect = (platform, scaleAnim) => {
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
        friction: 4,
        tension: 50,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        friction: 4,
        tension: 50,
      }),
    ]).start();
  };

  const handleDone = async () => {
    // Validate that usernames are entered for selected platforms
    if (selectedPlatforms.leetcode && !tempLcUsername) {
      alert('Please enter your Leetcode username');
      return;
    }
    if (selectedPlatforms.codechef && !tempCcUsername) {
      alert('Please enter your Codechef username');
      return;
    }
    if (selectedPlatforms.codeforces && !tempCfUsername) {
      alert('Please enter your Codeforces username');
      return;
    }

    // Check if at least one platform is selected
    if (!selectedPlatforms.leetcode && !selectedPlatforms.codechef && !selectedPlatforms.codeforces) {
      alert('Please select at least one platform');
      return;
    }

    // Animate exit
    Animated.parallel([
      Animated.sequence([
        Animated.timing(leetcodeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(codechefAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(codeforcesAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(platformsContainerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      Animated.timing(buttonAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      // Save usernames to AsyncStorage and update state
      if (selectedPlatforms.leetcode) {
        await AsyncStorage.setItem('lcusername', tempLcUsername);
        setLcUsername(tempLcUsername);
      }
      if (selectedPlatforms.codechef) {
        await AsyncStorage.setItem('ccusername', tempCcUsername);
        setCcUsername(tempCcUsername);
      }
      if (selectedPlatforms.codeforces) {
        await AsyncStorage.setItem('cfusername', tempCfUsername);
        setCfUsername(tempCfUsername);
      }

      navigation.navigate('Main');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1B1E" />
      <Text style={styles.title}>Choose Your Platforms</Text>
      <Animated.View 
        style={[
          styles.card,
          {
            transform: [
              { 
                translateY: platformsContainerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                })
              }
            ],
            opacity: platformsContainerAnim,
          }
        ]}
      >
        <View style={styles.checkboxContainer}>
          <Animated.View style={[styles.checkboxWrapper, { transform: [{ scale: leetcodeScale }] }]}>
            <CheckBox
              value={selectedPlatforms.leetcode}
              onValueChange={() => handlePlatformSelect('leetcode', leetcodeScale)}
              style={styles.checkboxStyle}
              color={selectedPlatforms.leetcode ? '#1E90FF' : undefined}
            />
            <Text style={styles.label}>Leetcode</Text>
          </Animated.View>

          <Animated.View style={[styles.checkboxWrapper, { transform: [{ scale: codechefScale }] }]}>
            <CheckBox
              value={selectedPlatforms.codechef}
              onValueChange={() => handlePlatformSelect('codechef', codechefScale)}
              style={styles.checkboxStyle}
              color={selectedPlatforms.codechef ? '#1E90FF' : undefined}
            />
            <Text style={styles.label}>Codechef</Text>
          </Animated.View>

          <Animated.View style={[styles.checkboxWrapper, { transform: [{ scale: codeforcesScale }] }]}>
            <CheckBox
              value={selectedPlatforms.codeforces}
              onValueChange={() => handlePlatformSelect('codeforces', codeforcesScale)}
              style={styles.checkboxStyle}
              color={selectedPlatforms.codeforces ? '#1E90FF' : undefined}
            />
            <Text style={styles.label}>Codeforces</Text>
          </Animated.View>
        </View>

        {selectedPlatforms.leetcode && (
          <Animated.View style={[styles.inputContainer, { opacity: leetcodeAnim }]}>
            <Text style={styles.inputLabel}>Enter Leetcode Username:</Text>
            <TextInput
              style={styles.input}
              value={tempLcUsername}
              onChangeText={setTempLcUsername}
              placeholder="Leetcode Username"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoCapitalize="none"
            />
          </Animated.View>
        )}

        {selectedPlatforms.codechef && (
          <Animated.View style={[styles.inputContainer, { opacity: codechefAnim }]}>
            <Text style={styles.inputLabel}>Enter Codechef Username:</Text>
            <TextInput
              style={styles.input}
              value={tempCcUsername}
              onChangeText={setTempCcUsername}
              placeholder="Codechef Username"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoCapitalize="none"
            />
          </Animated.View>
        )}

        {selectedPlatforms.codeforces && (
          <Animated.View style={[styles.inputContainer, { opacity: codeforcesAnim }]}>
            <Text style={styles.inputLabel}>Enter Codeforces Username:</Text>
            <TextInput
              style={styles.input}
              value={tempCfUsername}
              onChangeText={setTempCfUsername}
              placeholder="Codeforces Username"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoCapitalize="none"
            />
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [
              { 
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                })
              }
            ],
            opacity: buttonAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1A1B1E',
  },
  title: {
    fontSize: 28,
    marginTop: 60,
    marginBottom: 30,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#2A2B2F',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkboxContainer: {
    flexDirection: 'column',
    width: '100%',
    marginBottom: 16,
    gap: 15,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#32333A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkboxStyle: {
    width: 24,
    height: 24,
    marginRight: 12,
    borderRadius: 6,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.9,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3F404A',
    padding: 16,
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#32333A',
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});