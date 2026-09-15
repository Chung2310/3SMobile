import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { JourneyProvider } from '@/context/JourneyContext';
import { colors } from '@/theme';

function NavigationGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/login');
    if (session && inAuthGroup) router.replace('/(app)/(tabs)');
  }, [loading, router, segments, session]);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.secondary} /></View>;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <JourneyProvider>
        <NavigationGate />
      </JourneyProvider>
    </AuthProvider>
  );
}

export function IndexRedirect() {
  return <Redirect href="/(app)/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
