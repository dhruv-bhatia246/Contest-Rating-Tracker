import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const themes = {
  dark: {
    mode: 'dark',
    background: '#0d0d12',
    surface: '#14162a',
    card: '#1a1d35',
    textPrimary: '#f1f3f9',
    textSecondary: '#8b8fa6',
    border: '#262a40',
    accent: '#7c6fff',
    accentSoft: 'rgba(124,111,255,0.15)',
    error: '#ff5252',
    skeleton: '#22273b',
    shadow: 'transparent',
    cardGradientStart: '#1e2140',
    cardGradientEnd: '#151830',
  },
  light: {
    mode: 'light',
    background: '#f5f6fa',
    surface: '#eceef5',
    card: '#ffffff',
    textPrimary: '#1a1d2e',
    textSecondary: '#5f6580',
    border: '#e0e3ef',
    accent: '#5b4cdb',
    accentSoft: 'rgba(91,76,219,0.12)',
    error: '#ef4444',
    skeleton: '#e5e7eb',
    shadow: '#00000012',
    cardGradientStart: '#ffffff',
    cardGradientEnd: '#f0f1fa',
  },
};

const getSystemMode = () => {
  const scheme = Appearance.getColorScheme();
  return scheme === 'light' ? 'light' : 'dark';
};

export const ThemeProvider = ({ children }) => {
  const [selectedMode, setSelectedMode] = useState('dark');
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setSelectedMode(savedTheme);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (selectedMode === 'system') {
      setMode(getSystemMode());
      const subscription = Appearance.addChangeListener(() => {
        setMode(getSystemMode());
      });
      return () => subscription.remove?.();
    }
    setMode(selectedMode);
    return undefined;
  }, [selectedMode]);

  const changeTheme = async (selected) => {
    setSelectedMode(selected);
    await AsyncStorage.setItem('appTheme', selected);
  };

  return (
    <ThemeContext.Provider value={{ selectedMode, mode, setMode: changeTheme, colors: themes[mode], accent: themes[mode].accent }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
