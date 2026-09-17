import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomFoodItem, FoodCategory, FoodItem } from '@/types/nutrition';

export const FOOD_CATEGORY_LABELS: Record<FoodCategory | 'all' | 'custom', string> = {
  all: 'Tất cả',
  custom: 'Món tự thêm',
  protein: 'Đạm / Thịt cá',
  carbs: 'Tinh bột',
  veggies: 'Rau củ',
  soup: 'Canh / Súp',
  fat: 'Chất béo tốt',
  snack: 'Bữa phụ / Hạt',
  drink: 'Đồ uống',
};

export const VIETNAMESE_FOOD_DATABASE: FoodItem[] = [
  // --- ĐẠM (PROTEIN) ---
  {
    id: 'food_uc_ga',
    name: 'Ức gà phi lê áp chảo',
    category: 'protein',
    categoryLabel: 'Đạm / Thịt cá',
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    unit: 'đĩa',
    defaultServingGrams: 150,
    servingLabel: '150g (1 miếng vừa)',
    prepTip: 'Áp chảo lửa vừa với ít dầu oliu, rắc tiêu đen và muối thảo mộc',
  },
  {
    id: 'food_than_bo',
    name: 'Thăn bò xào tỏi nấm',
    category: 'protein',
    categoryLabel: 'Đạm / Thịt cá',
    caloriesPer100g: 142,
    proteinPer100g: 26,
    carbsPer100g: 1.5,
    fatPer100g: 4.2,
    unit: 'đĩa',
    defaultServingGrams: 150,
    servingLabel: '150g',
    prepTip: 'Xào nhanh lửa lớn để thịt bò mềm ngọt, không bị dai',
  },
  {
    id: 'food_ca_hoi',
    name: 'Cá hồi áp chảo sốt chanh leo',
    category: 'protein',
    categoryLabel: 'Đạm / Thịt cá',
    caloriesPer100g: 206,
    proteinPer100g: 22,
    carbsPer100g: 1,
    fatPer100g: 12.5,
    unit: 'miếng',
    defaultServingGrams: 150,
    servingLabel: '150g (1 miếng phi lê)',
    prepTip: 'Áp chảo da giòn, giàu Omega-3 tốt cho tim mạch và khớp',
  },
  {
    id: 'food_trung_ga',
    name: 'Trứng gà luộc / ốp la',
    category: 'protein',
    categoryLabel: 'Đạm / Thịt cá',
    caloriesPer100g: 155,
    proteinPer100g: 13,
    carbsPer100g: 1.1,
    fatPer100g: 11,
    unit: 'quả',
    defaultServingGrams: 100,
    servingLabel: '2 quả (khoảng 100g)',
    prepTip: 'Luộc lòng đào 6-7 phút để giữ trọn vẹn dinh dưỡng',
  },
  {
    id: 'food_tom_hap',
    name: 'Tôm sú hấp sả gừng',
    category: 'protein',
    categoryLabel: 'Đạm / Thịt cá',
    caloriesPer100g: 99,
    proteinPer100g: 24,
    carbsPer100g: 0.2,
    fatPer100g: 0.3,
    unit: 'đĩa',
    defaultServingGrams: 150,
    servingLabel: '150g (6-7 con vừa)',
    prepTip: 'Hấp nhanh 5 phút, đạm cao cực kỳ ít mỡ',
  },
  {
    id: 'food_dau_phu',
    name: 'Đậu phụ hấp / nướng nồi chiên',
    category: 'protein',
    categoryLabel: 'Đạm / Thịt cá',
    caloriesPer100g: 82,
    proteinPer100g: 9,
    carbsPer100g: 2,
    fatPer100g: 4.5,
    unit: 'bìa',
    defaultServingGrams: 150,
    servingLabel: '1 bìa lớn (150g)',
    prepTip: 'Đậu phụ non hấp ấm chấm xì dầu tỏi ớt thanh đạm',
  },
  {
    id: 'food_ca_ro_dong',
    name: 'Cá rô phi nướng muối ớt',
    category: 'protein',
    categoryLabel: 'Đạm / Thịt cá',
    caloriesPer100g: 112,
    proteinPer100g: 20,
    carbsPer100g: 0,
    fatPer100g: 3,
    unit: 'con',
    defaultServingGrams: 200,
    servingLabel: '200g thịt nạc',
    prepTip: 'Nướng giấy bạc hoặc nồi chiên không dầu thơm ngon',
  },

  // --- TINH BỘT (CARBS) ---
  {
    id: 'food_com_gao_lut',
    name: 'Cơm gạo lứt huyết rồng',
    category: 'carbs',
    categoryLabel: 'Tinh bột',
    caloriesPer100g: 110,
    proteinPer100g: 2.6,
    carbsPer100g: 23,
    fatPer100g: 0.9,
    unit: 'bát',
    defaultServingGrams: 150,
    servingLabel: '1 bát lưng (150g)',
    prepTip: 'Giàu chất xơ, chỉ số đường huyết thấp giúp no lâu và giảm tích mỡ',
  },
  {
    id: 'food_com_trang',
    name: 'Cơm trắng gạo dẻo',
    category: 'carbs',
    categoryLabel: 'Tinh bột',
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
    unit: 'bát',
    defaultServingGrams: 150,
    servingLabel: '1 bát (150g)',
    prepTip: 'Phù hợp nạp năng lượng nhanh trước và sau buổi tập nặng',
  },
  {
    id: 'food_khoai_lang',
    name: 'Khoai lang vàng luộc / hấp',
    category: 'carbs',
    categoryLabel: 'Tinh bột',
    caloriesPer100g: 86,
    proteinPer100g: 1.6,
    carbsPer100g: 20,
    fatPer100g: 0.1,
    unit: 'củ',
    defaultServingGrams: 150,
    servingLabel: '1 củ vừa (150g)',
    prepTip: 'Nguồn tinh bột chậm lý tưởng cho bữa sáng và bữa phụ trước tập',
  },
  {
    id: 'food_yen_mach',
    name: 'Yến mạch cán dẹt ngâm sữa',
    category: 'carbs',
    categoryLabel: 'Tinh bột',
    caloriesPer100g: 389,
    proteinPer100g: 16.9,
    carbsPer100g: 66,
    fatPer100g: 6.9,
    unit: 'phần',
    defaultServingGrams: 50,
    servingLabel: '50g (4 thìa canh)',
    prepTip: 'Nấu chín 3 phút với sữa chua hoặc sữa tươi không đường',
  },
  {
    id: 'food_banh_mi_den',
    name: 'Bánh mì nguyên cám (Rye bread)',
    category: 'carbs',
    categoryLabel: 'Tinh bột',
    caloriesPer100g: 250,
    proteinPer100g: 9,
    carbsPer100g: 48,
    fatPer100g: 3.2,
    unit: 'lát',
    defaultServingGrams: 60,
    servingLabel: '2 lát (60g)',
    prepTip: 'Tiện lợi cho bữa sáng ăn kèm trứng hoặc bơ đậu phộng',
  },
  {
    id: 'food_pho_bo_tai',
    name: 'Phở bò tái nạc (Ít bánh phở)',
    category: 'carbs',
    categoryLabel: 'Tinh bột',
    caloriesPer100g: 95,
    proteinPer100g: 7,
    carbsPer100g: 13,
    fatPer100g: 2.2,
    unit: 'tô',
    defaultServingGrams: 400,
    servingLabel: '1 tô vừa (400g)',
    prepTip: 'Yêu cầu nước dùng trong, không béo, nhiều hành giá',
  },

  // --- RAU CỦ (VEGGIES) ---
  {
    id: 'food_bong_cai_xanh',
    name: 'Bông cải xanh (Broccoli) hấp',
    category: 'veggies',
    categoryLabel: 'Rau củ',
    caloriesPer100g: 34,
    proteinPer100g: 2.8,
    carbsPer100g: 7,
    fatPer100g: 0.4,
    unit: 'đĩa',
    defaultServingGrams: 150,
    servingLabel: '1 đĩa (150g)',
    prepTip: 'Hấp 4 phút để giữ màu xanh tươi và vitamin C dồi dào',
  },
  {
    id: 'food_rau_muong',
    name: 'Rau muống luộc / xào tỏi ít dầu',
    category: 'veggies',
    categoryLabel: 'Rau củ',
    caloriesPer100g: 25,
    proteinPer100g: 2.6,
    carbsPer100g: 3,
    fatPer100g: 0.3,
    unit: 'đĩa',
    defaultServingGrams: 150,
    servingLabel: '1 đĩa vừa (150g)',
    prepTip: 'Nước luộc rau vắt chanh làm nước canh thanh mát',
  },
  {
    id: 'food_salad_tron',
    name: 'Salad xà lách sốt giấm dừa',
    category: 'veggies',
    categoryLabel: 'Rau củ',
    caloriesPer100g: 40,
    proteinPer100g: 1.5,
    carbsPer100g: 5,
    fatPer100g: 1.5,
    unit: 'đĩa',
    defaultServingGrams: 150,
    servingLabel: '1 đĩa đầy (150g)',
    prepTip: 'Tránh các loại sốt mayonnaise nhiều calo ẩn',
  },
  {
    id: 'food_dua_leo_ca_chua',
    name: 'Dưa leo và cà chua bi',
    category: 'veggies',
    categoryLabel: 'Rau củ',
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.8,
    fatPer100g: 0.2,
    unit: 'phần',
    defaultServingGrams: 150,
    servingLabel: '150g',
    prepTip: 'Ăn kèm bữa chính giúp tăng thể tích dạ dày, tạo cảm giác no sớm',
  },

  // --- CANH / SÚP ---
  {
    id: 'food_canh_ngot_thit',
    name: 'Canh rau ngót nấu thịt nạc băm',
    category: 'soup',
    categoryLabel: 'Canh / Súp',
    caloriesPer100g: 42,
    proteinPer100g: 4.5,
    carbsPer100g: 2.8,
    fatPer100g: 1.3,
    unit: 'bát',
    defaultServingGrams: 250,
    servingLabel: '1 bát canh (250g)',
    prepTip: 'Món canh truyền thống giàu vitamin, thanh nhiệt cơ thể',
  },
  {
    id: 'food_canh_bi_dao',
    name: 'Canh bí đao sườn non',
    category: 'soup',
    categoryLabel: 'Canh / Súp',
    caloriesPer100g: 38,
    proteinPer100g: 3.8,
    carbsPer100g: 2.2,
    fatPer100g: 1.5,
    unit: 'bát',
    defaultServingGrams: 250,
    servingLabel: '1 bát canh (250g)',
    prepTip: 'Hớt sạch bọt mỡ khi nấu để nước canh trong ngọt',
  },
  {
    id: 'food_canh_chua_ca',
    name: 'Canh chua cá lóc miền Tây',
    category: 'soup',
    categoryLabel: 'Canh / Súp',
    caloriesPer100g: 54,
    proteinPer100g: 6.8,
    carbsPer100g: 3.5,
    fatPer100g: 1.2,
    unit: 'bát',
    defaultServingGrams: 300,
    servingLabel: '1 bát tô (300g)',
    prepTip: 'Nấu cùng dứa, cà chua, bạc hà, thanh nhẹ kích thích vị giác',
  },

  // --- CHẤT BÉO TỐT (FAT) ---
  {
    id: 'food_qua_bo',
    name: 'Quả bơ sáp cắt lát',
    category: 'fat',
    categoryLabel: 'Chất béo tốt',
    caloriesPer100g: 160,
    proteinPer100g: 2,
    carbsPer100g: 8.5,
    fatPer100g: 14.7,
    unit: 'nửa quả',
    defaultServingGrams: 75,
    servingLabel: '1/2 quả (75g)',
    prepTip: 'Chất béo không bão hòa đơn tốt cho tim mạch và hấp thụ vitamin',
  },
  {
    id: 'food_dau_oliu',
    name: 'Dầu oliu nguyên chất (Extra Virgin)',
    category: 'fat',
    categoryLabel: 'Chất béo tốt',
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    unit: 'thìa',
    defaultServingGrams: 10,
    servingLabel: '1 thìa cafe (10g)',
    prepTip: 'Dùng trộn trực tiếp vào salad hoặc áp chảo nhẹ',
  },
  {
    id: 'food_hat_hanh_nhan',
    name: 'Hạt hạnh nhân rang tự nhiên',
    category: 'fat',
    categoryLabel: 'Chất béo tốt',
    caloriesPer100g: 579,
    proteinPer100g: 21,
    carbsPer100g: 22,
    fatPer100g: 49.9,
    unit: 'hạt',
    defaultServingGrams: 25,
    servingLabel: 'Khoảng 15-18 hạt (25g)',
    prepTip: 'Món ăn vặt dinh dưỡng lành mạnh giữa các buổi làm việc',
  },

  // --- BỮA PHỤ / ĐỒ UỐNG ---
  {
    id: 'food_whey_protein',
    name: 'Sữa đạm Whey Isolate',
    category: 'snack',
    categoryLabel: 'Bữa phụ / Hạt',
    caloriesPer100g: 380,
    proteinPer100g: 88,
    carbsPer100g: 3,
    fatPer100g: 1.5,
    unit: 'muỗng',
    defaultServingGrams: 30,
    servingLabel: '1 muỗng (30g)',
    prepTip: 'Pha với 250ml nước lạnh uống ngay sau buổi tập kháng lực',
  },
  {
    id: 'food_sua_chua_hy_lap',
    name: 'Sữa chua Hy Lạp không đường',
    category: 'snack',
    categoryLabel: 'Bữa phụ / Hạt',
    caloriesPer100g: 97,
    proteinPer100g: 10,
    carbsPer100g: 3.6,
    fatPer100g: 5,
    unit: 'hộp',
    defaultServingGrams: 120,
    servingLabel: '1 hộp (120g)',
    prepTip: 'Ăn kèm vài lát chuối hoặc quả mọng giàu lợi khuẩn tiêu hóa',
  },
  {
    id: 'food_chuoi_tieu',
    name: 'Chuối tiêu chín',
    category: 'snack',
    categoryLabel: 'Bữa phụ / Hạt',
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    unit: 'quả',
    defaultServingGrams: 100,
    servingLabel: '1 quả vừa (100g)',
    prepTip: 'Nguồn Kali và carb tự nhiên giúp chống chuột rút cơ khi tập',
  },
  {
    id: 'food_nuoc_dua',
    name: 'Nước dừa tươi tự nhiên',
    category: 'drink',
    categoryLabel: 'Đồ uống',
    caloriesPer100g: 19,
    proteinPer100g: 0.7,
    carbsPer100g: 3.7,
    fatPer100g: 0.2,
    unit: 'ly',
    defaultServingGrams: 250,
    servingLabel: '1 ly (250ml)',
    prepTip: 'Bổ sung điện giải tự nhiên tuyệt vời sau các buổi Cardio',
  },
];

/**
 * Tính toán dinh dưỡng dựa trên gram thực tế
 */
export function calculateFoodMacros(food: FoodItem, grams: number) {
  const ratio = Math.max(0, grams) / 100;
  return {
    calories: Math.round(food.caloriesPer100g * ratio),
    protein: Math.round(food.proteinPer100g * ratio * 10) / 10,
    carbs: Math.round(food.carbsPer100g * ratio * 10) / 10,
    fat: Math.round(food.fatPer100g * ratio * 10) / 10,
  };
}

export const STORAGE_KEY_CUSTOM_FOODS = '3s_gym_custom_foods';
export const STORAGE_KEY_DELETED_FOODS = '3s_gym_deleted_food_ids';

let inMemoryCustomFoods: CustomFoodItem[] = [];
let inMemoryDeletedIds: string[] = [];
let isStorageLoaded = false;
type FoodDbListener = () => void;
const listeners = new Set<FoodDbListener>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error notifying food db listener:', e);
    }
  });
}

/**
 * Đăng ký lắng nghe thay đổi của kho món ăn (thêm/sửa/xóa/reset)
 */
export function subscribeToFoodDatabaseUpdates(listener: FoodDbListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Tải danh sách món tùy biến và ID đã xóa từ AsyncStorage
 */
export async function loadFoodDatabaseFromStorage(): Promise<void> {
  try {
    const [rawCustom, rawDeleted] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_CUSTOM_FOODS),
      AsyncStorage.getItem(STORAGE_KEY_DELETED_FOODS),
    ]);
    if (rawCustom) {
      const parsed = JSON.parse(rawCustom);
      if (Array.isArray(parsed)) inMemoryCustomFoods = parsed;
    }
    if (rawDeleted) {
      const parsed = JSON.parse(rawDeleted);
      if (Array.isArray(parsed)) inMemoryDeletedIds = parsed;
    }
    isStorageLoaded = true;
    notifyListeners();
  } catch (err) {
    console.error('Error loading food database from AsyncStorage:', err);
  }
}

// Khởi chạy tải dữ liệu ngầm ngay khi app khởi động
void loadFoodDatabaseFromStorage();

export function getCustomFoods(): CustomFoodItem[] {
  return inMemoryCustomFoods;
}

export function getDeletedFoodIds(): string[] {
  return inMemoryDeletedIds;
}

/**
 * Lấy danh sách toàn bộ món ăn (Món tự thêm + Món mẫu chuẩn 3S Gym, trừ đi các món đã xóa)
 */
export function getAllCombinedFoods(): FoodItem[] {
  const deletedSet = new Set(inMemoryDeletedIds);
  const filteredCustom = inMemoryCustomFoods.filter((f) => !deletedSet.has(f.id));
  const filteredDefaults = VIETNAMESE_FOOD_DATABASE.filter((f) => !deletedSet.has(f.id));
  return [...filteredCustom, ...filteredDefaults];
}

/**
 * Lưu danh sách món tùy biến xuống AsyncStorage
 */
export async function saveCustomFoods(foods: CustomFoodItem[]): Promise<void> {
  inMemoryCustomFoods = foods;
  notifyListeners();
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_FOODS, JSON.stringify(foods));
  } catch (e) {
    console.error('Failed to save custom foods to AsyncStorage', e);
  }
}

/**
 * Thêm một món ăn mới vào kho
 */
export async function addCustomFood(
  food: Omit<CustomFoodItem, 'id' | 'isCustom'>
): Promise<CustomFoodItem> {
  const newFood: CustomFoodItem = {
    ...food,
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    categoryLabel: FOOD_CATEGORY_LABELS[food.category] || 'Món tự thêm',
    isCustom: true,
  };
  const nextList = [newFood, ...inMemoryCustomFoods];
  await saveCustomFoods(nextList);
  return newFood;
}

/**
 * Chỉnh sửa món ăn (Nếu là món chuẩn hệ thống, tạo bản override)
 */
export async function updateCustomFood(
  id: string,
  updates: Partial<Omit<CustomFoodItem, 'id'>>
): Promise<void> {
  const existsInCustom = inMemoryCustomFoods.some((f) => f.id === id);
  if (existsInCustom) {
    const nextList = inMemoryCustomFoods.map((f) =>
      f.id === id
        ? {
            ...f,
            ...updates,
            categoryLabel: updates.category
              ? FOOD_CATEGORY_LABELS[updates.category]
              : f.categoryLabel,
          }
        : f
    );
    await saveCustomFoods(nextList);
  } else {
    // Món chuẩn hệ thống được chỉnh sửa -> tạo bản ghi đè
    const defaultFood = VIETNAMESE_FOOD_DATABASE.find((f) => f.id === id);
    if (defaultFood) {
      const overrideItem: CustomFoodItem = {
        ...defaultFood,
        ...updates,
        id: `custom_override_${id}_${Date.now()}`,
        categoryLabel: updates.category
          ? FOOD_CATEGORY_LABELS[updates.category]
          : defaultFood.categoryLabel,
        isCustom: true,
      };
      const nextDeleted = Array.from(new Set([...inMemoryDeletedIds, id]));
      inMemoryDeletedIds = nextDeleted;
      try {
        await AsyncStorage.setItem(STORAGE_KEY_DELETED_FOODS, JSON.stringify(nextDeleted));
      } catch (e) {
        console.error('Failed to save deleted food ids', e);
      }
      await saveCustomFoods([overrideItem, ...inMemoryCustomFoods]);
    }
  }
}

/**
 * Xóa món ăn khỏi kho
 */
export async function deleteCustomFood(id: string): Promise<void> {
  const nextCustom = inMemoryCustomFoods.filter((f) => f.id !== id);
  const nextDeleted = Array.from(new Set([...inMemoryDeletedIds, id]));
  inMemoryDeletedIds = nextDeleted;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DELETED_FOODS, JSON.stringify(nextDeleted));
  } catch (e) {
    console.error('Failed to save deleted food ids', e);
  }
  await saveCustomFoods(nextCustom);
}

/**
 * Khôi phục kho món ăn về mặc định chuẩn ban đầu của 3S Gym
 */
export async function resetCustomFoods(): Promise<void> {
  inMemoryCustomFoods = [];
  inMemoryDeletedIds = [];
  notifyListeners();
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_CUSTOM_FOODS),
      AsyncStorage.removeItem(STORAGE_KEY_DELETED_FOODS),
    ]);
  } catch (e) {
    console.error('Failed to reset custom foods in AsyncStorage', e);
  }
}

/**
 * Tìm kiếm món ăn theo từ khóa và danh mục (Hỗ trợ danh mục 'custom' và từ khóa tiếng Việt)
 */
export function searchFoods(
  query: string,
  category: FoodCategory | 'all' | 'custom' = 'all'
): FoodItem[] {
  const q = query.trim().toLowerCase();
  const allFoods = getAllCombinedFoods();

  return allFoods.filter((f) => {
    if (category === 'custom') {
      if (!f.isCustom) return false;
    } else if (category !== 'all') {
      if (f.category !== category) return false;
    }
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      (f.categoryLabel && f.categoryLabel.toLowerCase().includes(q)) ||
      (f.prepTip && f.prepTip.toLowerCase().includes(q))
    );
  });
}

/**
 * Lấy món ăn theo ID từ kho tổng hợp
 */
export function getFoodById(id: string): FoodItem | undefined {
  return getAllCombinedFoods().find((f) => f.id === id);
}
