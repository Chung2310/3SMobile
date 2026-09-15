import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { JourneyProvider } from '@/context/JourneyContext';
import { colors } from '@/theme';

const LOGO_WHITE = require('../../assets/public/logo-white.png');

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
    return (
      <View style={styles.splashContainer}>
        <Image source={LOGO_WHITE} style={styles.splashLogo} resizeMode="contain" />
      </View>
    );
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
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  splashLogo: {
    width: 240,
    height: 85,
  },
});

