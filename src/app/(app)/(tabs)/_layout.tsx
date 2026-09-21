import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

interface TabDef {
  name: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  route?: string;
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

const ADMIN_TABS: TabDef[] = [
  {
    name: 'transfer',
    label: 'Điều chuyển',
    activeIcon: 'swap-horizontal',
    inactiveIcon: 'swap-horizontal-outline',
  },
  {
    name: 'accounts',
    label: 'Tài khoản',
    activeIcon: 'people-circle',
    inactiveIcon: 'people-circle-outline',
  },
  {
    name: 'index',
    label: 'Tổng quan',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
    route: 'index',
  },
  {
    name: 'modules',
    label: 'Chức năng',
    activeIcon: 'grid',
    inactiveIcon: 'grid-outline',
    route: '/(app)/admin/modules',
  },
  {
    name: 'settings',
    label: 'Cài đặt',
    activeIcon: 'settings-sharp',
    inactiveIcon: 'settings-outline',
    route: '/(app)/profile',
  },
];

function FixedTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
  const activeTabs = isAdmin ? ADMIN_TABS : TABS;

  // Safe padding vừa vặn, cân xứng cho cả iPhone lẫn Android
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 6)
      : Math.max(insets.bottom, 10);

  // Xác định tab đang active hiện tại
  const currentRouteName = state.routes[state.index]?.name || 'index';

  const handleTabPress = (tab: TabDef, isFocused: boolean) => {
    if (tab.route && tab.route.startsWith('/')) {
      router.push(tab.route as any);
      return;
    }

    const targetRoute = state.routes.find((r: any) => r.name === tab.name);
    if (targetRoute) {
      const event = navigation.emit({
        type: 'tabPress',
        target: targetRoute.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(tab.name);
      }
    } else {
      navigation.navigate(tab.name);
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
      {activeTabs.map((tab) => {
        const isFocused = currentRouteName === tab.name;

        return (
          <Pressable
            key={tab.name}
            onPress={() => handleTabPress(tab, isFocused)}
            style={({ pressed }) => [
              styles.tabItem,
              pressed && { opacity: 0.8 },
            ]}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.label}
          >
            {isFocused ? (
              <View style={styles.centerIconPlaceholder}>
                <View style={styles.activeCircle}>
                  <Ionicons name={tab.activeIcon} size={20} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={tab.inactiveIcon}
                  size={20}
                  color={colors.textMuted}
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
      backBehavior="initialRoute"
      tabBar={(props) => <FixedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 1. Tổng quan (ở giữa trên thanh tab, nhưng là màn hình gốc / mặc định khi trở về) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
        }}
      />

      {/* 2. Trợ lý AI */}
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Trợ lý AI',
        }}
      />

      {/* 3. Dinh dưỡng */}
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Dinh dưỡng',
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

