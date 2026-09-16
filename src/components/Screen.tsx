import { ContextIcon } from '@/components/LibraryIcon';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
  scroll?: boolean;
  onBack?: () => void;
}

export function Screen({ title, subtitle, children, refreshing = false, onRefresh, scroll = true, onBack }: ScreenProps) {
  const insets = useSafeAreaInsets();

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>{onBack && <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ContextIcon name="arrow-left" size={24} color={colors.text} /></Pressable>}<Text numberOfLines={2} ellipsizeMode="tail" style={[styles.title, { flex: 1 }]}>{title}</Text></View>
            {subtitle ? <Text numberOfLines={3} ellipsizeMode="tail" style={styles.subtitle}>{subtitle}</Text> : null}
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  title: { ...typography.display, fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase', color: colors.text, letterSpacing: -0.5 },
  subtitle: { ...typography.body, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: spacing.xs },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  staticContent: { flex: 1, padding: spacing.lg },
});
