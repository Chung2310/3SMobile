import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// Kích hoạt LayoutAnimation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TabDef {
  name: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const TABS: TabDef[] = [
  { name: 'customers', label: 'Khách hàng', icon: 'users' },
  { name: 'nutrition', label: 'Dinh dưỡng', icon: 'coffee' },
  { name: 'index', label: 'Tổng quan', icon: 'home' },
  { name: 'roadmap', label: 'Roadmap', icon: 'map' },
  { name: 'progress', label: 'Tiến độ', icon: 'trending-up' },
];

function CircularTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 48) + 8
      : Math.max(insets.bottom, 16);

  // Xác định tab đang active hiện tại
  const currentRouteName = state.routes[state.index]?.name || 'index';
  let activeRingIndex = TABS.findIndex((t) => t.name === currentRouteName);
  if (activeRingIndex === -1) activeRingIndex = 2; // Mặc định ở giữa là 'index' (Tổng quan)

  // Vòng quay 5 vị trí (-2, -1, 0, 1, 2) sao cho vị trí 0 (chính giữa) luôn là tab active
  const visibleTabs = [-2, -1, 0, 1, 2].map((offset) => {
    const ringIdx = (activeRingIndex + offset + 5) % 5;
    return {
      ...TABS[ringIdx],
      isCenter: offset === 0,
    };
  });

  const handleTabPress = (tabName: string) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {
      // Fallback nếu máy không hỗ trợ LayoutAnimation
    }

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
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {visibleTabs.map((tab) => {
        const isFocused = tab.isCenter;

        return (
          <Pressable
            key={tab.name}
            onPress={() => handleTabPress(tab.name)}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
            hitSlop={8}
          >
            {isFocused ? (
              <View style={styles.activeCircle}>
                <Feather name={tab.icon} size={22} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <Feather name={tab.icon} size={20} color="#9CA3AF" />
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
      tabBar={(props) => <CircularTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 1. Khách hàng */}
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Khách hàng',
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

      {/* 5. Tiến độ */}
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Tiến độ',
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
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'visible',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    zIndex: 10,
  },
  activeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#16A34A',
    fontWeight: '500',
  },
  tabLabelInactive: {
    color: '#9CA3AF',
  },
});
