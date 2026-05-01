import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../ThemeContext';

// Mock each screen before importing SettingsScreen
jest.mock('../screens/HomeScreen', () => ({ HomeScreen: () => null }));

// Import SettingsScreen after mocks
import { SettingsScreen } from '../screens/SettingsScreen';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  reset: jest.fn(),
};

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
  });

  it('renders the Settings title', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'platform_leetcode') return Promise.resolve('true');
      if (key === 'platform_codeforces') return Promise.resolve('true');
      if (key === 'platform_codechef') return Promise.resolve('true');
      if (key === 'lcusername') return Promise.resolve('testlc');
      if (key === 'cfusername') return Promise.resolve('testcf');
      if (key === 'ccusername') return Promise.resolve('testcc');
      if (key === 'appTheme') return Promise.resolve('dark');
      if (key === 'reminders_enabled') return Promise.resolve('true');
      return Promise.resolve(null);
    });

    const { findByText } = renderWithTheme(
      <SettingsScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('Settings')).toBeTruthy();
    });
  });

  it('shows platform toggle section', async () => {
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    const { findByText } = renderWithTheme(
      <SettingsScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('PLATFORMS')).toBeTruthy();
    });
  });

  it('shows theme section', async () => {
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    const { findByText } = renderWithTheme(
      <SettingsScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('APPEARANCE')).toBeTruthy();
    });
  });
});
