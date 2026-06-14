import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Term } from '@/constants/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getPermissionStatus(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminders(terms: Term[], remindersPerDay: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (terms.length === 0) return;

  const wakeHour = 8;
  const sleepHour = 22;
  const interval = Math.max(1, Math.floor((sleepHour - wakeHour) / remindersPerDay));

  const pool = terms.filter(t => new Date(t.nextReviewDate) <= new Date());
  const source = pool.length > 0 ? pool : terms;

  for (let i = 0; i < Math.min(remindersPerDay, source.length); i++) {
    const term = source[i % source.length];
    const hour = wakeHour + i * interval;
    if (hour >= sleepHour) break;

    // Schedule for next occurrence of this hour
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(hour, 0, 0, 0);
    if (trigger <= now) trigger.setDate(trigger.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Term Learner',
        body: `What does "${term.word}" mean?`,
        data: { termId: term.id, definition: term.definition },
        sound: true,
      },
      trigger: {
        hour: trigger.getHours(),
        minute: 0,
        repeats: true,
      },
    });
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
