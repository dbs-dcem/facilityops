import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ProcedureRecord } from '@/context/AppContext';
import { INTERVAL_DAYS, statusFor } from '@/utils/dueStatus';

const CHANNEL_ID = 'iris-maintenance';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Maintenance Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleMaintenanceNotifications(records: ProcedureRecord[]): Promise<void> {
  // Cancel all previously scheduled IRIS notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.identifier.startsWith('iris-'))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const overdue = records.filter(r => statusFor(r.lastCompletedAt, r.procedure.interval).state === 'overdue');
  const due     = records.filter(r => statusFor(r.lastCompletedAt, r.procedure.interval).state === 'due');

  // Overdue summary — fires 10 seconds after the app schedules it (avoids past-time rejection)
  if (overdue.length > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'iris-overdue-alert',
      content: {
        title: 'I.R.I.S. — Overdue Tasks',
        body: overdue.length === 1
          ? `"${overdue[0].procedure.title}" is overdue.`
          : `${overdue.length} PM tasks are overdue and need attention.`,
        data: { state: 'overdue' },
        categoryIdentifier: CHANNEL_ID,
      },
      trigger: { seconds: 10, repeats: false } as Notifications.NotificationTriggerInput,
    });
  }

  // Per-task notifications for upcoming due dates (next 10 soonest)
  const now = Date.now();
  const upcoming = records
    .filter(r => r.lastCompletedAt != null)
    .map(r => ({
      r,
      dueMs: r.lastCompletedAt!.getTime() + INTERVAL_DAYS[r.procedure.interval] * 86_400_000,
    }))
    .filter(({ dueMs }) => dueMs > now)
    .sort((a, b) => a.dueMs - b.dueMs)
    .slice(0, 10);

  for (const { r, dueMs } of upcoming) {
    // Fire at 8am on the due date
    const fireAt = new Date(dueMs);
    fireAt.setHours(8, 0, 0, 0);
    if (fireAt.getTime() <= now) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `iris-due-${r.procedure.id}`,
      content: {
        title: 'I.R.I.S. — PM Due Today',
        body: `"${r.procedure.title}" is due today.`,
        data: { procedureId: r.procedure.id },
        categoryIdentifier: CHANNEL_ID,
      },
      trigger: { date: fireAt } as Notifications.NotificationTriggerInput,
    });
  }

  // Daily 8am repeating reminder when there's anything needing attention
  if (overdue.length > 0 || due.length > 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'iris-daily-reminder',
      content: {
        title: 'I.R.I.S. — Daily Check',
        body: overdue.length > 0
          ? `${overdue.length} overdue · ${due.length} due soon · Tap to review.`
          : `${due.length} task${due.length !== 1 ? 's' : ''} due soon. Tap to review.`,
        data: { state: 'overdue' },
        categoryIdentifier: CHANNEL_ID,
      },
      trigger: { hour: 8, minute: 0, repeats: true } as Notifications.NotificationTriggerInput,
    });
  }
}
