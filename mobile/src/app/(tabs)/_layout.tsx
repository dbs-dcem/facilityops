import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';

const TAB_ICONS: Record<string, string> = {
  index: '⌂', calendar: '◫', library: '≡', logs: '◉', reports: '▣',
};

function TabIcon({ name, color }: { name: string; color: ColorValue }) {
  return (
    <Text style={{ fontSize: 18, color, fontFamily: FONT_MONO, lineHeight: 22 }}>
      {TAB_ICONS[name] ?? '·'}
    </Text>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.line, borderTopWidth: 1 },
        tabBarActiveTintColor: colors.verify,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: ({ color }) => <TabIcon name="index"    color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }} />
      <Tabs.Screen name="library"  options={{ title: 'Library',  tabBarIcon: ({ color }) => <TabIcon name="library"  color={color} /> }} />
      <Tabs.Screen name="logs"     options={{ title: 'Logs',     tabBarIcon: ({ color }) => <TabIcon name="logs"     color={color} /> }} />
      <Tabs.Screen name="reports"  options={{ title: 'Reports',  tabBarIcon: ({ color }) => <TabIcon name="reports"  color={color} /> }} />
    </Tabs>
  );
}
