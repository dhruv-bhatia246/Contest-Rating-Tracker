import * as Notifications from 'expo-notifications';
import {
  initializeNotifications,
  notifyRatingChange,
} from '../utils/notificationHelper';

describe('notificationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeNotifications', () => {
    it('requests notification permissions', async () => {
      await initializeNotifications();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('handles permission request failure gracefully', async () => {
      Notifications.requestPermissionsAsync.mockRejectedValueOnce(new Error('denied'));
      await expect(initializeNotifications()).resolves.not.toThrow();
    });
  });

  describe('notifyRatingChange', () => {
    it('schedules notification when rating changes up', async () => {
      await notifyRatingChange('LeetCode', 1500, 1600);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'LeetCode Rating Updated',
          body: '1500 → 1600',
          sound: 'default',
        },
        trigger: null,
      });
    });

    it('schedules notification when rating changes down', async () => {
      await notifyRatingChange('Codeforces', 1200, 1100);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Codeforces Rating Updated',
          body: '1200 → 1100',
          sound: 'default',
        },
        trigger: null,
      });
    });

    it('does not notify when ratings are the same', async () => {
      await notifyRatingChange('LeetCode', 1500, 1500);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does not notify when newRating is null', async () => {
      await notifyRatingChange('LeetCode', 1500, null);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does not notify when oldRating is null', async () => {
      await notifyRatingChange('LeetCode', null, 1500);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does not notify when both ratings are null', async () => {
      await notifyRatingChange('LeetCode', null, null);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('handles scheduling failure gracefully', async () => {
      Notifications.scheduleNotificationAsync.mockRejectedValueOnce(new Error('fail'));
      await expect(notifyRatingChange('LeetCode', 1500, 1600)).resolves.not.toThrow();
    });
  });
});
