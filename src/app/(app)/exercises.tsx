import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { Notice } from '@/components/workouts/Controls';

export default function ExercisesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const allowed = session?.user.role === 'PT' || session?.user.role === 'ADMIN';
  return <Screen title="Thư viện bài tập" subtitle="Tra cứu kỹ thuật và xây dựng giáo án." onBack={() => router.navigate('/(app)/(tabs)')}>
    {allowed ? <ExerciseLibrary key={session.user.id} /> : <Notice error text="Thư viện bài tập dành cho PT và quản trị viên." />}
  </Screen>;
}
