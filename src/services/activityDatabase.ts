import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityCategory =
  | 'STRENGTH'
  | 'CARDIO'
  | 'MARTIAL_ARTS'
  | 'SPORTS'
  | 'RECOVERY';

export interface ActivityItem {
  id: string;
  name: string;
  category: ActivityCategory;
  categoryLabel: string;
  met: number;
  defaultDurationMinutes: number;
  defaultDistanceKm?: number;
  benchmarkText: string;
  description: string;
  badgeColor: string;
  isCustom?: boolean;
  updatedAt?: string;
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  STRENGTH: 'Tập tạ / Gym',
  CARDIO: 'Cardio / Chạy bộ / Bơi',
  MARTIAL_ARTS: 'Võ thuật / Kickfit',
  SPORTS: 'Thể thao đối kháng',
  RECOVERY: 'Phục hồi / Giãn cơ',
};

export const ACTIVITY_CATEGORY_COLORS: Record<ActivityCategory, string> = {
  STRENGTH: '#2563eb',
  CARDIO: '#ea580c',
  MARTIAL_ARTS: '#7c3aed',
  SPORTS: '#059669',
  RECOVERY: '#4f46e5',
};

export const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'gym_hiit',
    name: 'Gym / Kháng lực cường độ cao (1h)',
    category: 'STRENGTH',
    categoryLabel: 'Tập tạ / Gym',
    met: 6.5,
    defaultDurationMinutes: 60,
    benchmarkText: '1h tập tạ ~ 400 - 500 kcal',
    description: 'Tập tạ nặng, nghỉ ngắn, superset kích thích phì đại cơ bắp tối đa.',
    badgeColor: '#2563eb',
  },
  {
    id: 'running_5k',
    name: 'Chạy bộ 5km (Pace ~6:00)',
    category: 'CARDIO',
    categoryLabel: 'Chạy bộ',
    met: 9.8,
    defaultDurationMinutes: 30,
    defaultDistanceKm: 5,
    benchmarkText: 'Chạy 5km ~ 450 - 550 kcal',
    description: 'Chạy tốc độ trung bình 10 km/h, đốt calo và tăng dung tích tim phổi.',
    badgeColor: '#ea580c',
  },
  {
    id: 'swimming_1k',
    name: 'Bơi lội 1km (Bơi sải / Ếch)',
    category: 'CARDIO',
    categoryLabel: 'Bơi lội',
    met: 7.5,
    defaultDurationMinutes: 40,
    defaultDistanceKm: 1,
    benchmarkText: 'Bơi 1km ~ 350 - 450 kcal',
    description: 'Vận động toàn thân dưới nước, giảm áp lực lên khớp gối và cột sống.',
    badgeColor: '#0284c7',
  },
  {
    id: 'cycling_20k',
    name: 'Cycling / Đạp xe 20km ngoài trời',
    category: 'CARDIO',
    categoryLabel: 'Đạp xe',
    met: 7.5,
    defaultDurationMinutes: 50,
    defaultDistanceKm: 20,
    benchmarkText: 'Đạp xe 20km ~ 350 - 500 kcal',
    description: 'Tốc độ 22-25 km/h, kích hoạt đùi trước, mông và sức bền tim mạch.',
    badgeColor: '#16a34a',
  },
  {
    id: 'tabata_hiit',
    name: 'Tabata / HIIT ngắt quãng (30p)',
    category: 'CARDIO',
    categoryLabel: 'Cardio / HIIT',
    met: 9.5,
    defaultDurationMinutes: 30,
    benchmarkText: '30 phút HIIT ~ 350 - 450 kcal',
    description: '20s nỗ lực tối đa + 10s nghỉ, hiệu ứng đốt mỡ sau tập (EPOC).',
    badgeColor: '#dc2626',
  },
  {
    id: 'boxing_kickfit',
    name: 'Boxing / Kickfit (45p)',
    category: 'MARTIAL_ARTS',
    categoryLabel: 'Võ thuật',
    met: 8.5,
    defaultDurationMinutes: 45,
    benchmarkText: '45 phút Boxing ~ 400 - 500 kcal',
    description: 'Đấm bao cát, di chuyển linh hoạt, rèn luyện phản xạ và siết eo.',
    badgeColor: '#7c3aed',
  },
  {
    id: 'jump_rope',
    name: 'Nhảy dây tốc độ (30p)',
    category: 'CARDIO',
    categoryLabel: 'Cardio',
    met: 10.0,
    defaultDurationMinutes: 30,
    benchmarkText: '30 phút nhảy dây ~ 400 - 550 kcal',
    description: '100-120 nhịp/phút, tiêu hao calo vượt trội so với chạy bộ.',
    badgeColor: '#db2777',
  },
  {
    id: 'badminton',
    name: 'Cầu lông / Tennis đối kháng (1h)',
    category: 'SPORTS',
    categoryLabel: 'Thể thao',
    met: 6.5,
    defaultDurationMinutes: 60,
    benchmarkText: '1h đối kháng ~ 360 - 480 kcal',
    description: 'Di chuyển bước chân liên tục, xoay người linh hoạt và đập cầu.',
    badgeColor: '#059669',
  },
  {
    id: 'cardio_zone2',
    name: 'Cardio Zone 2 / LISS (45p)',
    category: 'CARDIO',
    categoryLabel: 'Zone 2 LISS',
    met: 5.5,
    defaultDurationMinutes: 45,
    benchmarkText: '45 phút Zone 2 ~ 250 - 350 kcal',
    description: 'Nhịp tim 60-70% Max HR, tối ưu hóa quá trình oxy hóa mỡ thừa.',
    badgeColor: '#0891b2',
  },
  {
    id: 'yoga_mobility',
    name: 'Yoga & Giãn cơ phục hồi (45p)',
    category: 'RECOVERY',
    categoryLabel: 'Phục hồi',
    met: 3.0,
    defaultDurationMinutes: 45,
    benchmarkText: '45 phút Yoga ~ 120 - 200 kcal',
    description: 'Giảm đau mỏi cơ, tăng tầm vận động khớp (ROM) và hạ hormone cortisol.',
    badgeColor: '#4f46e5',
  },
];

const STORAGE_KEY_CUSTOM_ACTIVITIES = '@3sgym_custom_activities_v1';
const STORAGE_KEY_DELETED_ACTIVITIES = '@3sgym_deleted_activities_v1';

type ActivityUpdateListener = () => void;
const listeners: Set<ActivityUpdateListener> = new Set();

export function subscribeToActivityDatabaseUpdates(listener: ActivityUpdateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Lỗi listener activityDatabase:', e);
    }
  });
}

/**
 * Lấy danh sách ID các bài tập mặc định đã bị xóa
 */
async function getDeletedActivityIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DELETED_ACTIVITIES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Lấy danh sách bài tập tùy biến / đã sửa
 */
async function getCustomActivities(): Promise<ActivityItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_ACTIVITIES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Lấy toàn bộ danh sách bộ môn vận động (mặc định + tùy biến - đã xóa)
 */
export async function getAllCombinedActivities(): Promise<ActivityItem[]> {
  const [customList, deletedIds] = await Promise.all([
    getCustomActivities(),
    getDeletedActivityIds(),
  ]);

  const deletedSet = new Set(deletedIds);
  const customMap = new Map<string, ActivityItem>();
  customList.forEach((c) => customMap.set(c.id, c));

  const baseFiltered = DEFAULT_ACTIVITIES.filter((d) => !deletedSet.has(d.id)).map((d) => {
    if (customMap.has(d.id)) {
      const overridden = customMap.get(d.id)!;
      customMap.delete(d.id);
      return overridden;
    }
    return d;
  });

  const remainingCustom = Array.from(customMap.values());
  return [...remainingCustom, ...baseFiltered];
}

/**
 * Thêm bộ môn vận động mới (Create)
 */
export async function addCustomActivity(activity: Omit<ActivityItem, 'id' | 'isCustom' | 'updatedAt'>): Promise<ActivityItem> {
  const customList = await getCustomActivities();
  const newActivity: ActivityItem = {
    ...activity,
    id: `custom_act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    categoryLabel: activity.categoryLabel || ACTIVITY_CATEGORY_LABELS[activity.category] || 'Vận động',
    badgeColor: activity.badgeColor || ACTIVITY_CATEGORY_COLORS[activity.category] || '#2563eb',
    isCustom: true,
    updatedAt: new Date().toISOString(),
  };

  const updated = [newActivity, ...customList];
  await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_ACTIVITIES, JSON.stringify(updated));
  notifyListeners();
  return newActivity;
}

/**
 * Cập nhật thông tin bộ môn vận động (Update)
 */
export async function updateCustomActivity(
  id: string,
  updates: Partial<Omit<ActivityItem, 'id'>>
): Promise<ActivityItem | null> {
  const customList = await getCustomActivities();
  const existingIdx = customList.findIndex((c) => c.id === id);

  if (existingIdx >= 0) {
    const updatedItem: ActivityItem = {
      ...customList[existingIdx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    customList[existingIdx] = updatedItem;
    await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_ACTIVITIES, JSON.stringify(customList));
    notifyListeners();
    return updatedItem;
  }

  // Nếu là bài tập mặc định đang được sửa, clone sang danh sách tùy biến
  const defaultItem = DEFAULT_ACTIVITIES.find((d) => d.id === id);
  if (defaultItem) {
    const overriddenItem: ActivityItem = {
      ...defaultItem,
      ...updates,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };
    const updated = [overriddenItem, ...customList];
    await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_ACTIVITIES, JSON.stringify(updated));
    notifyListeners();
    return overriddenItem;
  }

  return null;
}

/**
 * Xóa bộ môn vận động khỏi kho (Delete)
 */
export async function deleteCustomActivity(id: string): Promise<boolean> {
  const customList = await getCustomActivities();
  const isCustom = customList.some((c) => c.id === id);

  if (isCustom) {
    const filtered = customList.filter((c) => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_ACTIVITIES, JSON.stringify(filtered));
  } else {
    // Nếu là bài tập mặc định, thêm vào danh sách đã xóa
    const deletedIds = await getDeletedActivityIds();
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      await AsyncStorage.setItem(STORAGE_KEY_DELETED_ACTIVITIES, JSON.stringify(deletedIds));
    }
  }

  notifyListeners();
  return true;
}

/**
 * Khôi phục danh mục vận động chuẩn của 3S Gym
 */
export async function resetCustomActivities(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY_CUSTOM_ACTIVITIES),
    AsyncStorage.removeItem(STORAGE_KEY_DELETED_ACTIVITIES),
  ]);
  notifyListeners();
}
