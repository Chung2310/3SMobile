import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { homeForRole } from '@/services/adminAccess';
export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={session ? homeForRole(session.user.role) : '/(auth)/login'} />;
}
