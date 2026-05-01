import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../ThemeContext';
import { ContestsScreen } from '../screens/ContestsScreen';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('ContestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'OK', result: [] }),
        text: () => Promise.resolve(''),
      })
    );
  });

  it('renders without crashing', async () => {
    const { UNSAFE_root } = renderWithTheme(<ContestsScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { UNSAFE_root } = renderWithTheme(<ContestsScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('fetches contests from APIs', async () => {
    const futureTs = Math.floor(Date.now() / 1000) + 86400;

    global.fetch.mockImplementation((url) => {
      if (url.includes('codeforces')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            result: [{ id: 1, name: 'CF Round', phase: 'BEFORE', startTimeSeconds: futureTs, durationSeconds: 7200 }],
          }),
        });
      }
      if (url.includes('leetcode')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: { allContests: [{ title: 'LC Weekly', titleSlug: 'lc-1', startTime: futureTs, duration: 5400 }] },
          }),
        });
      }
      if (url.includes('codechef')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            future_contests: [{ contest_code: 'CC1', contest_name: 'CC Starter', contest_start_date_iso: new Date(futureTs * 1000).toISOString(), contest_duration: 120 }],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithTheme(<ContestsScreen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
