import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface TabDef {
  name: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const TABS: TabDef[] = [
  { name: 'assistant', label: 'Trợ lý AI', icon: 'cpu' },
  { name: 'nutrition', label: 'Dinh dưỡng', icon: 'coffee' },
  { name: 'index', label: 'Tổng quan', icon: 'home' },
  { name: 'roadmap', label: 'Roadmap', icon: 'map' },
  { name: 'progress', label: 'Inbody', icon: 'maximize' },
];

function FixedTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 48) + 8
      : Math.max(insets.bottom, 16);

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
          height: 56 + bottomPadding,
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
            style={[styles.tabItem, isCenter && styles.tabItemCenter]}
            hitSlop={8}
          >
            {isCenter ? (
              <View style={styles.activeCircle}>
                <Feather name="home" size={22} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <Feather
                  name={tab.icon}
                  size={20}
                  color={isFocused ? '#16A34A' : '#9CA3AF'}
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
        name="customers"
        options={{
          href: null,
        }}
      />
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
  tabItemCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    zIndex: 10,
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
