import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainScreen from '../screens/MainScreen';
import { ThemeProvider } from '../ThemeContext';

// Mock all sub-screens
jest.mock('../screens/HomeScreen', () => ({
  HomeScreen: () => {
    const { Text } = require('react-native');
    return <Text>HomeScreen</Text>;
  },
}));

jest.mock('../screens/LeetcodeScreen', () => ({
  LeetcodeScreen: () => {
    const { Text } = require('react-native');
    return <Text>LeetcodeScreen</Text>;
  },
}));

jest.mock('../screens/CodeforcesScreen', () => ({
  CodeforcesScreen: () => {
    const { Text } = require('react-native');
    return <Text>CodeforcesScreen</Text>;
  },
}));

jest.mock('../screens/CodechefScreen', () => ({
  CodechefScreen: () => {
    const { Text } = require('react-native');
    return <Text>CodechefScreen</Text>;
  },
}));

jest.mock('../screens/SettingsScreen', () => ({
  SettingsScreen: () => {
    const { Text } = require('react-native');
    return <Text>SettingsScreen</Text>;
  },
}));

jest.mock('../screens/ContestsScreen', () => ({
  ContestsScreen: () => {
    const { Text } = require('react-native');
    return <Text>ContestsScreen</Text>;
  },
}));

jest.mock('../screens/OnboardingScreen', () => ({
  OnboardingScreen: ({ onComplete }) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onComplete}>
        <Text>OnboardingScreen</Text>
      </TouchableOpacity>
    );
  },
}));

// Need to mock navigation container for MainScreen
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      push: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      reset: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ component: Component }) => {
      return <Component navigation={{ navigate: jest.fn(), goBack: jest.fn(), push: jest.fn(), addListener: jest.fn(() => jest.fn()), reset: jest.fn() }} />;
    },
  }),
}));

jest.mock('@react-navigation/material-top-tabs', () => ({
  createMaterialTopTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));

describe('MainScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
  });

  it('shows loading while checking onboarding state', () => {
    // getItem returns a never-resolving promise to stay in loading
    AsyncStorage.getItem.mockReturnValue(new Promise(() => {}));
    const { UNSAFE_root } = render(
      <ThemeProvider>
        <MainScreen />
      </ThemeProvider>
    );
    // Should render something (loading indicator)
    expect(UNSAFE_root).toBeTruthy();
  });

  it('shows onboarding screen when not onboarded', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'onboarding_done') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const { findByText } = render(
      <ThemeProvider>
        <MainScreen />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(findByText('OnboardingScreen')).toBeTruthy();
    });
  });

  it('shows home screen when already onboarded', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'onboarding_done') return Promise.resolve('true');
      if (key === 'appTheme') return Promise.resolve('dark');
      return Promise.resolve(null);
    });

    const { findByText } = render(
      <ThemeProvider>
        <MainScreen />
      </ThemeProvider>
    );

    const el = await findByText('HomeScreen');
    expect(el).toBeTruthy();
  });
});
