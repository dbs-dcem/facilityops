import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProvider, useApp } from '@/context/AppContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { requestNotificationPermissions, scheduleMaintenanceNotifications } from '@/services/notificationService';

function NotificationScheduler() {
  const { records } = useApp();
  useEffect(() => {
    requestNotificationPermissions()
      .then(granted => { if (granted) scheduleMaintenanceNotifications(records); })
      .catch(() => {});
  }, [records]);
  return null;
}

function RootStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppProvider>
        <NotificationScheduler />
        <RootStack />
      </AppProvider>
    </ThemeProvider>
  );
}
