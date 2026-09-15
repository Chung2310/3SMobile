import { Tabs } from 'expo-router';

import { TabIcon } from '@/components/UI';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tổng quan', tabBarLabel: 'Tổng quan', tabBarIcon: ({ color }) => <TabIcon glyph="⌂" color={String(color)} /> }} />
      <Tabs.Screen name="workouts" options={{ title: 'Tập luyện', tabBarLabel: 'Tập luyện', tabBarIcon: ({ color }) => <TabIcon glyph="◉" color={String(color)} /> }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Dinh dưỡng', tabBarLabel: 'Dinh dưỡng', tabBarIcon: ({ color }) => <TabIcon glyph="◆" color={String(color)} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Tiến độ', tabBarLabel: 'Tiến độ', tabBarIcon: ({ color }) => <TabIcon glyph="↗" color={String(color)} /> }} />
      <Tabs.Screen name="schedule" options={{ title: 'Lịch', tabBarLabel: 'Lịch', tabBarIcon: ({ color }) => <TabIcon glyph="□" color={String(color)} /> }} />
    </Tabs>
  );
}
