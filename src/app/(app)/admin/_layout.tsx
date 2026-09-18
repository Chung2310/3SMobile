import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { isAdminRole } from '@/services/adminAccess';
import { colors } from '@/theme';
export default function AdminLayout() {
  const { session, loading } = useAuth();
  if (loading) return <ActivityIndicator color={colors.primary} />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!isAdminRole(session.user.role)) return <Redirect href="/(app)/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
