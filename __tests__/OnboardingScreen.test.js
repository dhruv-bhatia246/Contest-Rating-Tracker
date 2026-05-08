import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ThemeProvider } from '../ThemeContext';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

// Mock fetch globally
global.fetch = jest.fn();

describe('OnboardingScreen', () => {
  let onCompleteMock;

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
    onCompleteMock = jest.fn();
    // Mock fetch to return valid responses for validation
    global.fetch.mockImplementation((url) => {
      if (url.includes('leetcode.com')) {
        return Promise.resolve({
          json: () => Promise.resolve({ data: { matchedUser: { username: 'testuser' } } })
        });
      }
      if (url.includes('codeforces.com')) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'OK' })
        });
      }
      if (url.includes('codechef.com')) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it('renders welcome step initially', () => {
    const { getByText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    expect(getByText('Rating Tracker')).toBeTruthy();
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('navigates to platform selection on Get Started', () => {
    const { getByText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    expect(getByText('Which platforms do you use?')).toBeTruthy();
  });

  it('shows all three platforms in step 1', () => {
    const { getByText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    expect(getByText('LeetCode')).toBeTruthy();
    expect(getByText('Codeforces')).toBeTruthy();
    expect(getByText('CodeChef')).toBeTruthy();
  });

  it('does not proceed without selecting a platform', () => {
    const { getByText, queryByText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByText('Continue'));
    // Should stay on step 1
    expect(queryByText('Which platforms do you use?')).toBeTruthy();
    expect(queryByText('Enter your usernames')).toBeNull();
  });

  it('proceeds to username step after selecting platform', () => {
    const { getByText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByText('LeetCode'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Enter your usernames')).toBeTruthy();
  });

  it('can go back from step 1 to welcome', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    expect(getByText('Which platforms do you use?')).toBeTruthy();
    // Press back button (chevron-back icon)
    fireEvent.press(getByTestId('icon-chevron-back'));
    expect(getByText('Rating Tracker')).toBeTruthy();
  });

  it('shows username input for selected platforms only', () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByText('LeetCode'));
    fireEvent.press(getByText('Codeforces'));
    fireEvent.press(getByText('Continue'));
    expect(getByPlaceholderText('Enter LeetCode username')).toBeTruthy();
    expect(getByPlaceholderText('Enter Codeforces username')).toBeTruthy();
    expect(queryByPlaceholderText('Enter CodeChef username')).toBeNull();
  });

  it('calls onComplete and saves data on finish', async () => {
    const { getByText, getByPlaceholderText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    // Step 0 -> 1
    fireEvent.press(getByText('Get Started'));
    // Select LeetCode
    fireEvent.press(getByText('LeetCode'));
    // Step 1 -> 2
    fireEvent.press(getByText('Continue'));
    // Enter username
    fireEvent.changeText(getByPlaceholderText('Enter LeetCode username'), 'testuser');

    await act(async () => {
      fireEvent.press(getByText('Finish Setup'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('platform_leetcode', 'true');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('lcusername', 'testuser');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_done', 'true');
    expect(onCompleteMock).toHaveBeenCalled();
  });

  it('saves disabled platforms as false', async () => {
    const { getByText, getByPlaceholderText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByText('LeetCode'));
    fireEvent.press(getByText('Continue'));
    fireEvent.changeText(getByPlaceholderText('Enter LeetCode username'), 'user1');

    await act(async () => {
      fireEvent.press(getByText('Finish Setup'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('platform_codeforces', 'false');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('platform_codechef', 'false');
  });

  it('can toggle platform selection on and off', () => {
    const { getByText } = renderWithTheme(
      <OnboardingScreen onComplete={onCompleteMock} />
    );
    fireEvent.press(getByText('Get Started'));
    // Select then deselect LeetCode
    fireEvent.press(getByText('LeetCode'));
    fireEvent.press(getByText('LeetCode'));
    // Try to continue - should fail since nothing is selected
    fireEvent.press(getByText('Continue'));
    expect(getByText('Which platforms do you use?')).toBeTruthy();
  });
});
