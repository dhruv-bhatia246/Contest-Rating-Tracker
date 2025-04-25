import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Easing, StatusBar, Alert, ActivityIndicator } from 'react-native';
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

  const [rememberMe, setRememberMe] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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

  // Load remember me preference
  useEffect(() => {
    const loadRememberMe = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem('rememberMe');
        if (savedRememberMe === 'true') {
          setRememberMe(true);
          // If remember me is true, check if we have saved usernames
          const savedLcUsername = await AsyncStorage.getItem('lcusername');
          const savedCfUsername = await AsyncStorage.getItem('cfusername');
          const savedCcUsername = await AsyncStorage.getItem('ccusername');
          
          let hasSavedUsernames = false;
          
          if (savedLcUsername) {
            setTempLcUsername(savedLcUsername);
            setSelectedPlatforms(prev => ({ ...prev, leetcode: true }));
            setLcUsername(savedLcUsername);
            hasSavedUsernames = true;
          }
          if (savedCfUsername) {
            setTempCfUsername(savedCfUsername);
            setSelectedPlatforms(prev => ({ ...prev, codeforces: true }));
            setCfUsername(savedCfUsername);
            hasSavedUsernames = true;
          }
          if (savedCcUsername) {
            setTempCcUsername(savedCcUsername);
            setSelectedPlatforms(prev => ({ ...prev, codechef: true }));
            setCcUsername(savedCcUsername);
            hasSavedUsernames = true;
          }

          // If we have saved usernames, automatically navigate to Main screen
          if (hasSavedUsernames) {
            // Small delay to allow animations to complete
            setTimeout(() => {
              navigation.navigate('Main');
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error loading remember me preference:', error);
      }
    };
    loadRememberMe();
  }, []);

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

  const validateLeetcodeUsername = async (username) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`https://leetcode.com/${username}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.status === 200 || response.status === 301 || response.status === 302;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Leetcode validation timed out');
      } else {
        console.error('Error validating Leetcode username:', error);
      }
      return false;
    }
  };

  const validateCodeforcesUsername = async (username) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return false;
      }

      const text = await response.text();
      const data = JSON.parse(text);
      return data.status === 'OK' && data.result[0]?.handle === username;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Codeforces validation timed out');
      } else {
        console.error('Error validating Codeforces username:', error);
      }
      return false;
    }
  };

  const validateCodechefUsername = async (username) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://codechef-api.vercel.app/handle/${username}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return false;
      }

      const text = await response.text();
      const data = JSON.parse(text);
      return data.success;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Codechef validation timed out');
      } else {
        console.error('Error validating Codechef username:', error);
      }
      return false;
    }
  };

  const handleDone = async () => {
    // Basic validation first
    if (selectedPlatforms.leetcode && !tempLcUsername) {
      Alert.alert('Error', 'Please enter your Leetcode username');
      return;
    }
    if (selectedPlatforms.codechef && !tempCcUsername) {
      Alert.alert('Error', 'Please enter your Codechef username');
      return;
    }
    if (selectedPlatforms.codeforces && !tempCfUsername) {
      Alert.alert('Error', 'Please enter your Codeforces username');
      return;
    }

    if (!selectedPlatforms.leetcode && !selectedPlatforms.codechef && !selectedPlatforms.codeforces) {
      Alert.alert('Error', 'Please select at least one platform');
      return;
    }

    setIsValidating(true);

    try {
      // Save remember me preference
      await AsyncStorage.setItem('rememberMe', rememberMe.toString());

      // Create validation promises for selected platforms
      const validationPromises = [];
      const validationResults = {};

      if (selectedPlatforms.leetcode) {
        validationPromises.push(
          validateLeetcodeUsername(tempLcUsername)
            .then(isValid => { validationResults.leetcode = isValid; })
        );
      }
      if (selectedPlatforms.codeforces) {
        validationPromises.push(
          validateCodeforcesUsername(tempCfUsername)
            .then(isValid => { validationResults.codeforces = isValid; })
        );
      }
      if (selectedPlatforms.codechef) {
        validationPromises.push(
          validateCodechefUsername(tempCcUsername)
            .then(isValid => { validationResults.codechef = isValid; })
        );
      }

      // Wait for all validations to complete
      await Promise.all(validationPromises);

      // Check validation results
      if (selectedPlatforms.leetcode && !validationResults.leetcode) {
        Alert.alert('Error', 'Invalid Leetcode username. Please check and try again.');
        return;
      }
      if (selectedPlatforms.codeforces && !validationResults.codeforces) {
        Alert.alert('Error', 'Invalid Codeforces username. Please check and try again.');
        return;
      }
      if (selectedPlatforms.codechef && !validationResults.codechef) {
        Alert.alert('Error', 'Invalid Codechef username. Please check and try again.');
        return;
      }

      // All validations passed, proceed with saving
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
    } finally {
      setIsValidating(false);
    }
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
        <View style={styles.rememberMeContainer}>
          <CheckBox
            value={rememberMe}
            onValueChange={setRememberMe}
            style={styles.rememberMeCheckbox}
            color={rememberMe ? '#1E90FF' : undefined}
          />
          <Text style={styles.rememberMeText}>Remember Me</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isValidating && styles.buttonDisabled]}
          onPress={handleDone}
          activeOpacity={0.8}
          disabled={isValidating}
        >
          {isValidating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
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
    // paddingTop: 0,
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
    marginTop: -10,
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
  buttonDisabled: {
    opacity: 0.7,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  rememberMeCheckbox: {
    marginRight: 8,
  },
  rememberMeText: {
    color: '#fff',
    fontSize: 14,
  },
});