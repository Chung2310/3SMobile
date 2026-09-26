import { useEffect, type ReactNode } from 'react';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { JourneyProvider } from '@/context/JourneyContext';
import { colors } from '@/theme';
import { homeForRole } from '@/services/adminAccess';

export { ErrorBoundary } from 'expo-router';

const LOGO_WHITE = require('../../assets/public/logo-white.png');

function AndroidNavigationSafeArea({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'android') return children;

  return (
    <SafeAreaView style={styles.navigationContainer} edges={['bottom', 'left', 'right']}>
      {/* Measure the inset content bounds so tabs and screens do not add the
          system navigation inset again. Top insets remain owned by screens. */}
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </SafeAreaView>
  );
}

function NavigationGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/login');
    if (session && inAuthGroup) router.replace(homeForRole(session.user.role));
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
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  if (!fontsLoaded && !fontError) return <View style={styles.splashContainer}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <JourneyProvider>
          <AndroidNavigationSafeArea>
            <NavigationGate />
          </AndroidNavigationSafeArea>
        </JourneyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export function IndexRedirect() {
  const { session } = useAuth(); return <Redirect href={homeForRole(session?.user.role)} />;
}

const styles = StyleSheet.create({
  navigationContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#032D6E',
  },
  splashLogo: {
    width: 240,
    height: 85,
  },
});
