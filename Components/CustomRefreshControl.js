import React from 'react';
import { RefreshControl } from 'react-native';

export const CustomRefreshControl = ({ refreshing, onRefresh }) => {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#3B82F6"
      colors={["#3B82F6"]}
      progressBackgroundColor="#2A2B2F"
      progressViewOffset={10}
    />
  );
}; 