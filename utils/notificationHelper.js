import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initializeNotifications() {
  try {
    await Notifications.requestPermissionsAsync();
  } catch (error) {
    console.warn('Notification permission request failed', error);
  }
}

export async function notifyRatingChange(platform, oldRating, newRating) {
  if (!newRating || !oldRating || oldRating === newRating) {
    return;
  }

  const title = `${platform} Rating Updated`;
  const body = `${oldRating} → ${newRating}`;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to schedule notification', error);
  }
}
