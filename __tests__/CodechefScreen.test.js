import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../ThemeContext';
import { CodechefScreen } from '../screens/CodechefScreen';

const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('CodechefScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html></html>'),
        json: () => Promise.resolve({}),
      })
    );
  });

  it('shows set username prompt when no username is set', async () => {
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    // Ensure fetch doesn't resolve so no data loads
    global.fetch.mockReturnValue(new Promise(() => {}));

    const { findByText } = renderWithTheme(<CodechefScreen />);
    const el = await findByText('Set Username');
    expect(el).toBeTruthy();
  });

  it('renders without crashing', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'ccusername') return Promise.resolve('chef_user');
      return Promise.resolve(null);
    });

    const { UNSAFE_root } = renderWithTheme(<CodechefScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('fetches data from CodeChef', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'ccusername') return Promise.resolve('chef_user');
      return Promise.resolve(null);
    });

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`
        <html>
          <script>var all_rating = [{"rating":1800,"code":"START01","name":"Starter"}];</script>
          <span class="rating">4 star</span>
        </html>
      `),
    });

    renderWithTheme(<CodechefScreen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('codechef.com/users/chef_user'),
        expect.anything()
      );
    });
  });
});
