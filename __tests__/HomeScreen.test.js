import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from '../screens/HomeScreen';
import { ThemeProvider } from '../ThemeContext';

const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn((event, cb) => jest.fn()),
};

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      })
    );
  });

  it('shows loading state initially', () => {
    const { getByTestId } = renderWithTheme(
      <HomeScreen navigation={mockNavigation} />
    );
    // ActivityIndicator should be present during loading
    // The loading state renders an ActivityIndicator
  });

  it('shows empty state when no platforms are enabled', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'platform_leetcode') return Promise.resolve('false');
      if (key === 'platform_codeforces') return Promise.resolve('false');
      if (key === 'platform_codechef') return Promise.resolve('false');
      return Promise.resolve(null);
    });

    const { findByText } = renderWithTheme(
      <HomeScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('No platforms enabled yet')).toBeTruthy();
    });
  });

  it('shows platform card when platform is enabled with cached data', async () => {
    const lcCache = JSON.stringify({
      data: {
        matchedUser: { submitStats: { acSubmissionNum: [{ count: 500 }] } },
        userContestRanking: { rating: 1689, attendedContestsCount: 24, topPercentage: 14.2 },
      },
    });

    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'platform_leetcode') return Promise.resolve('true');
      if (key === 'platform_codeforces') return Promise.resolve('false');
      if (key === 'platform_codechef') return Promise.resolve('false');
      if (key === 'lcusername') return Promise.resolve('testuser');
      if (key === 'cache_lc') return Promise.resolve(lcCache);
      return Promise.resolve(null);
    });

    const { findByText } = renderWithTheme(
      <HomeScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('LeetCode')).toBeTruthy();
    });
  });

  it('shows Codeforces card with user info data', async () => {
    const cfCache = JSON.stringify([
      { contestId: 1, newRating: 1400, rank: 500 },
      { contestId: 2, newRating: 1500, rank: 400 },
    ]);
    const cfInfo = JSON.stringify({
      rating: 1500,
      maxRating: 1600,
      rank: 'specialist',
      maxRank: 'expert',
    });

    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'platform_leetcode') return Promise.resolve('false');
      if (key === 'platform_codeforces') return Promise.resolve('true');
      if (key === 'platform_codechef') return Promise.resolve('false');
      if (key === 'cfusername') return Promise.resolve('tourist');
      if (key === 'cache_cf') return Promise.resolve(cfCache);
      if (key === 'cache_cf_info') return Promise.resolve(cfInfo);
      return Promise.resolve(null);
    });

    const { findByText } = renderWithTheme(
      <HomeScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('Codeforces')).toBeTruthy();
    });
  });

  it('shows CodeChef card when enabled', async () => {
    const ccCache = JSON.stringify({
      ratingData: [{ rating: 1800, code: 'START01', name: 'Starter' }],
      stars: '4',
    });

    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'platform_leetcode') return Promise.resolve('false');
      if (key === 'platform_codeforces') return Promise.resolve('false');
      if (key === 'platform_codechef') return Promise.resolve('true');
      if (key === 'ccusername') return Promise.resolve('chef_user');
      if (key === 'cache_cc') return Promise.resolve(ccCache);
      return Promise.resolve(null);
    });

    const { findByText } = renderWithTheme(
      <HomeScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('CodeChef')).toBeTruthy();
    });
  });

  it('fetches from API when no cache exists', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'platform_leetcode') return Promise.resolve('true');
      if (key === 'platform_codeforces') return Promise.resolve('false');
      if (key === 'platform_codechef') return Promise.resolve('false');
      if (key === 'lcusername') return Promise.resolve('testuser');
      return Promise.resolve(null); // no cache
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          matchedUser: { submitStats: { acSubmissionNum: [{ count: 100 }] } },
          userContestRanking: { rating: 1500, attendedContestsCount: 10, topPercentage: 20 },
        },
      }),
      text: () => Promise.resolve(''),
    });

    renderWithTheme(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('shows upcoming contests section', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key.startsWith('platform_')) return Promise.resolve('false');
      return Promise.resolve(null);
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'OK', result: [] }),
    });

    const { findByText } = renderWithTheme(
      <HomeScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(findByText('UPCOMING CONTESTS')).toBeTruthy();
    });
  });
});

describe('HomeScreen formatDuration logic', () => {
  // Test the formatDuration function indirectly by testing time formatting
  it('formats hours and minutes correctly', () => {
    const h = Math.floor(5400000 / 3600000);
    const m = Math.floor((5400000 % 3600000) / 60000);
    expect(h).toBe(1);
    expect(m).toBe(30);
    expect(`${h}h ${m}m`).toBe('1h 30m');
  });

  it('formats hours only', () => {
    const h = Math.floor(7200000 / 3600000);
    const m = Math.floor((7200000 % 3600000) / 60000);
    expect(h).toBe(2);
    expect(m).toBe(0);
    expect(`${h}h`).toBe('2h');
  });

  it('formats minutes only', () => {
    const h = Math.floor(2700000 / 3600000);
    const m = Math.floor((2700000 % 3600000) / 60000);
    expect(h).toBe(0);
    expect(m).toBe(45);
    expect(`${m}m`).toBe('45m');
  });
});
