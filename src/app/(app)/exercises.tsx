import { LibraryIconContext } from '@/components/LibraryIcon';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { Notice } from '@/components/workouts/Controls';

export default function ExercisesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const allowed = session?.user.role === 'PT' || session?.user.role === 'ADMIN';
  return <LibraryIconContext.Provider value={true}><Screen title="THƯ VIỆN BÀI TẬP" onBack={() => router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/workouts')}>
    {allowed ? <ExerciseLibrary key={session.user.id} /> : <Notice error text="Thư viện bài tập dành cho PT và quản trị viên." />}
  </Screen></LibraryIconContext.Provider>;
}
