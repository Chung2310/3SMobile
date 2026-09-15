import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="exercises" />
      <Stack.Screen name="progress-workspace" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
