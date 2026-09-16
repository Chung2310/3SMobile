import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { colors, spacing, typography } from '@/theme';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
  scroll?: boolean;
  onBack?: (() => void) | null;
}

export function Screen({ title, subtitle, children, refreshing = false, onRefresh, scroll = true, onBack }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const handleBack = onBack === null ? undefined : (onBack !== undefined ? onBack : () => router.navigate('/(app)/(tabs)'));

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} /> : undefined}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.staticContent}>{children}</View>
  );

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {title ? (
          <View style={styles.header}>
            <View style={styles.headerRow}>
              {handleBack && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  onPress={handleBack}
                  hitSlop={12}
                  style={styles.backBtn}
                >
                  <Feather name="arrow-left" size={20} color={colors.text} />
                </Pressable>
              )}
              <View style={styles.titleWrap}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.subtitle}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: 2,
  },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  staticContent: { flex: 1, padding: spacing.lg },
});
