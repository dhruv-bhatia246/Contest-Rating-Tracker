import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Test component that exposes theme values
const ThemeConsumer = () => {
  const { mode, colors, accent, setMode } = useTheme();
  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="accent">{accent}</Text>
      <Text testID="background">{colors.background}</Text>
      <TouchableOpacity testID="toggle" onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} />
    </>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
  });

  it('defaults to dark mode', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(getByTestId('mode').props.children).toBe('dark');
    expect(getByTestId('accent').props.children).toBe('#7c6fff');
    expect(getByTestId('background').props.children).toBe('#0d0d12');
  });

  it('loads saved light theme from AsyncStorage', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('light');
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('light');
    });
    expect(getByTestId('accent').props.children).toBe('#5b4cdb');
    expect(getByTestId('background').props.children).toBe('#f5f6fa');
  });

  it('loads saved dark theme from AsyncStorage', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('dark');
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('dark');
    });
  });

  it('ignores invalid saved theme value', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('purple');
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    // Should remain dark (default)
    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('dark');
    });
  });

  it('switches theme on toggle and persists to AsyncStorage', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(getByTestId('mode').props.children).toBe('dark');

    await act(async () => {
      fireEvent.press(getByTestId('toggle'));
    });

    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('light');
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('appTheme', 'light');
  });

  it('provides correct dark theme colors', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(getByTestId('background').props.children).toBe('#0d0d12');
  });
});
