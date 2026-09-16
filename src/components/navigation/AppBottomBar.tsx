import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { colors } from '@/theme';

interface TabDef {
  name: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
}

const TABS: TabDef[] = [
  { name: 'assistant', label: 'Trợ lý AI', icon: 'cpu', route: '/(app)/(tabs)/assistant' },
  { name: 'nutrition', label: 'Dinh dưỡng', icon: 'coffee', route: '/(app)/(tabs)/nutrition' },
  { name: 'index', label: 'Tổng quan', icon: 'home', route: '/(app)/(tabs)' },
  { name: 'roadmap', label: 'Roadmap', icon: 'map', route: '/(app)/(tabs)/roadmap' },
  { name: 'progress', label: 'Inbody', icon: 'maximize', route: '/(app)/(tabs)/progress' },
];

export interface AppBottomBarProps {
  activeTab?: string;
}

export function AppBottomBar({ activeTab }: AppBottomBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 6)
      : Math.max(insets.bottom, 10);

  const handleTabPress = (route: string) => {
    router.navigate(route as any);
  };

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          height: 50 + bottomPadding,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isCenter = tab.name === 'index';
        const isFocused = activeTab === tab.name;

        return (
          <Pressable
            key={tab.name}
            onPress={() => handleTabPress(tab.route)}
            style={styles.tabItem}
            hitSlop={8}
            accessibilityLabel={tab.label}
          >
            {isCenter ? (
              <View style={styles.centerIconPlaceholder}>
                <View style={styles.activeCircle}>
                  <Feather name="home" size={20} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <Feather
                  name={tab.icon}
                  size={20}
                  color={isFocused ? colors.primary : colors.textMuted}
                />
              </View>
            )}
            <Text
              style={[
                styles.tabLabel,
                isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: 'visible',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 44,
    paddingBottom: 2,
  },
  centerIconPlaceholder: {
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
  },
  activeCircle: {
    position: 'absolute',
    bottom: -1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    width: 24,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 12,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: colors.textMuted,
  },
});
