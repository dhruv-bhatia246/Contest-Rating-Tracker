import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AnimatedCard } from '../Components/AnimatedCard';

describe('AnimatedCard', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <AnimatedCard>
        <Text>Card Content</Text>
      </AnimatedCard>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <AnimatedCard onPress={onPressMock}>
        <Text>Press Me</Text>
      </AnimatedCard>
    );
    fireEvent.press(getByText('Press Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('applies custom styles', () => {
    const { getByText } = render(
      <AnimatedCard style={{ backgroundColor: 'red' }}>
        <Text>Styled Card</Text>
      </AnimatedCard>
    );
    expect(getByText('Styled Card')).toBeTruthy();
  });
});
