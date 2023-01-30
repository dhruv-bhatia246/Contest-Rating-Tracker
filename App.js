import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainScreen from './screens/MainScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}