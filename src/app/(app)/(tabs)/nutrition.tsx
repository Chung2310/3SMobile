import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Busy, Notice } from '@/components/workouts/Controls';
import { useAuth } from '@/context/AuthContext';
import { CustomerNutritionView, PtNutritionWorkspace } from '@/components/nutrition';

export default function NutritionScreen() {
  const { session, loading } = useAuth();
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(app)/(tabs)');
    }
  };

  if (loading) {
    return (
      <Screen title="DINH DƯỠNG" onBack={handleBack}>
        <Busy />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen title="DINH DƯỠNG" onBack={handleBack}>
        <Notice text="Vui lòng đăng nhập để xem thông tin dinh dưỡng." />
      </Screen>
    );
  }

  const role = session.user.role;
  const isStaff = role === 'PT' || role === 'ADMIN';

  return (
    <Screen
      title="Dinh Dưỡng"
      scroll={false}
      onBack={handleBack}
    >
      <View style={styles.container}>
        {isStaff ? <PtNutritionWorkspace /> : <CustomerNutritionView />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: -16,
  },
});
