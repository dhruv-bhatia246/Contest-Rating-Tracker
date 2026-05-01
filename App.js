import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainScreen from './screens/MainScreen';
import { ThemeProvider } from './ThemeContext';
import { initializeNotifications } from './utils/notificationHelper';

export default function App() {
  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}