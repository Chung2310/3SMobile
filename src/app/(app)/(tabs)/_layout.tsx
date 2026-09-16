import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';

interface TabDef {
  name: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  {
    name: 'assistant',
    label: 'Trợ lý AI',
    activeIcon: 'sparkles',
    inactiveIcon: 'sparkles-outline',
  },
  {
    name: 'nutrition',
    label: 'Dinh dưỡng',
    activeIcon: 'nutrition',
    inactiveIcon: 'nutrition-outline',
  },
  {
    name: 'index',
    label: 'Tổng quan',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    name: 'roadmap',
    label: 'Roadmap',
    activeIcon: 'trail-sign',
    inactiveIcon: 'trail-sign-outline',
  },
  {
    name: 'progress',
    label: 'Inbody',
    activeIcon: 'body',
    inactiveIcon: 'body-outline',
  },
];

function FixedTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  // Safe padding vừa vặn, cân xứng cho cả iPhone lẫn Android
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 6)
      : Math.max(insets.bottom, 10);

  // Xác định tab đang active hiện tại
  const currentRouteName = state.routes[state.index]?.name || 'index';

  const handleTabPress = (tabName: string) => {
    const targetRoute = state.routes.find((r: any) => r.name === tabName);
    if (targetRoute) {
      const event = navigation.emit({
        type: 'tabPress',
        target: targetRoute.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(tabName);
      }
    } else {
      navigation.navigate(tabName);
    }
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
        const isFocused = currentRouteName === tab.name;

        return (
          <Pressable
            key={tab.name}
            onPress={() => handleTabPress(tab.name)}
            style={styles.tabItem}
            hitSlop={8}
          >
            {isCenter ? (
              <View style={styles.centerIconPlaceholder}>
                <View style={styles.activeCircle}>
                  <Ionicons name="home" size={20} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={isFocused ? tab.activeIcon : tab.inactiveIcon}
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

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <FixedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 1. Trợ lý AI */}
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Trợ lý AI',
        }}
      />

      {/* 2. Dinh dưỡng */}
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Dinh dưỡng',
        }}
      />

      {/* 3. Tổng quan (ở giữa - mặc định) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
        }}
      />

      {/* 4. Roadmap */}
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'Roadmap',
        }}
      />

      {/* 5. Inbody */}
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Inbody',
        }}
      />

      {/* Các tab cũ ẩn khỏi navigation */}
      <Tabs.Screen
        name="workouts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          href: null,
        }}
      />
    </Tabs>
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

