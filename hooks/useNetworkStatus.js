import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // Check initial network state
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, []);

  return isConnected;
}; 