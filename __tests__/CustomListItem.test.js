import React from 'react';
import { render } from '@testing-library/react-native';
import { CustomListItem } from '../Components/CustomListItem';

// Mock @rneui/base
jest.mock('@rneui/base', () => {
  const { View, Text, TouchableOpacity, Image } = require('react-native');
  return {
    ListItem: ({ children, onPress, ...props }) => (
      <TouchableOpacity onPress={onPress} testID="list-item" {...props}>
        {children}
      </TouchableOpacity>
    ),
    Avatar: (props) => <Image testID="avatar" source={props.source} />,
  };
});

// Add sub-components
const { ListItem } = require('@rneui/base');
ListItem.Content = ({ children }) => {
  const { View } = require('react-native');
  return <View>{children}</View>;
};
ListItem.Title = ({ children, style }) => {
  const { Text } = require('react-native');
  return <Text style={style}>{children}</Text>;
};

describe('CustomListItem', () => {
  const mockEnterChat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chat name', () => {
    const { getByText } = render(
      <CustomListItem id="1" chatName="Test Chat" enterChat={mockEnterChat} />
    );
    expect(getByText('Test Chat')).toBeTruthy();
  });

  it('renders an avatar image', () => {
    const { getByTestId } = render(
      <CustomListItem id="1" chatName="Test Chat" enterChat={mockEnterChat} />
    );
    expect(getByTestId('avatar')).toBeTruthy();
  });
});
