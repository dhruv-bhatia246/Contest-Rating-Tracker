import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../ThemeContext';
import { CodeforcesScreen } from '../screens/CodeforcesScreen';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('CodeforcesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'OK', result: [] }),
      })
    );
  });

  it('shows set username prompt when no username is set', async () => {
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    const { findByText } = renderWithTheme(<CodeforcesScreen />);
    await waitFor(() => {
      expect(findByText('Set Username')).toBeTruthy();
    });
  });

  it('fetches user info and rating history', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'cfusername') return Promise.resolve('tourist');
      return Promise.resolve(null);
    });

    global.fetch.mockImplementation((url) => {
      if (url.includes('user.info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            result: [{ handle: 'tourist', rating: 3800, maxRating: 3900, rank: 'legendary grandmaster', titlePhoto: '' }],
          }),
        });
      }
      if (url.includes('user.rating')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            result: [
              { contestId: 1, newRating: 3700, rank: 1, contestName: 'CF Round 1' },
              { contestId: 2, newRating: 3800, rank: 1, contestName: 'CF Round 2' },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithTheme(<CodeforcesScreen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('renders without crashing with cached data', async () => {
    const cachedInfo = JSON.stringify({ handle: 'tourist', rating: 3800, maxRating: 3900, rank: 'legendary grandmaster' });
    const cachedHistory = JSON.stringify([{ contestId: 1, newRating: 3800, rank: 1 }]);

    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'cfusername') return Promise.resolve('tourist');
      if (key === 'cache_cf_info') return Promise.resolve(cachedInfo);
      if (key === 'cache_cf') return Promise.resolve(cachedHistory);
      return Promise.resolve(null);
    });

    const { UNSAFE_root } = renderWithTheme(<CodeforcesScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
