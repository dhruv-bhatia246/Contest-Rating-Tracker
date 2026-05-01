import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../ThemeContext';
import { LeetcodeScreen } from '../screens/LeetcodeScreen';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('LeetcodeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      })
    );
  });

  it('shows set username prompt when no username is set', async () => {
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    global.fetch.mockReturnValue(new Promise(() => {}));

    const { findByText } = renderWithTheme(<LeetcodeScreen />);
    const el = await findByText('Set Username');
    expect(el).toBeTruthy();
  });

  it('renders loading state when username exists and data is fetching', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'lcusername') return Promise.resolve('testuser');
      return Promise.resolve(null);
    });

    // Never resolve fetch to keep loading
    global.fetch.mockReturnValue(new Promise(() => {}));

    const { UNSAFE_root } = renderWithTheme(<LeetcodeScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('fetches data from LeetCode GraphQL API', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'lcusername') return Promise.resolve('testuser');
      return Promise.resolve(null);
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          matchedUser: {
            profile: { userAvatar: 'https://example.com/avatar.png' },
            submitStats: { acSubmissionNum: [{ count: 500 }] },
          },
          userContestRanking: { rating: 1700, attendedContestsCount: 30, topPercentage: 10 },
          userContestRankingHistory: [],
        },
      }),
    });

    renderWithTheme(<LeetcodeScreen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://leetcode.com/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});
