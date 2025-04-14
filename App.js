import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainScreen from './screens/MainScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1A1B1E" />
      <MainScreen />
    </SafeAreaProvider>
  );
}