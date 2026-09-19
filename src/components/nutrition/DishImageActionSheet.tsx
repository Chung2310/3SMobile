import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Eye,
  Image as ImageIcon,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors, spacing } from '@/theme';
import { api } from '@/services/api/client';
import { resolveImageUrl } from '@/services/imageUtils';

export interface DishImageActionSheetProps {
  visible: boolean;
  dishName: string;
  currentImageUrl?: string | null;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  onRemoveImage?: () => void;
}

interface FoodImageLibraryItem {
  _id: string;
  name: string;
  imageUrl: string;
  category?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  usageCount?: number;
}

export function DishImageActionSheet({
  visible,
  dishName,
  currentImageUrl,
  onClose,
  onSelectImage,
  onRemoveImage,
}: DishImageActionSheetProps) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview full size image
  const [zoomVisible, setZoomVisible] = useState(false);

  // Sub-modal: Browse system food images library
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryItems, setLibraryItems] = useState<FoodImageLibraryItem[]>([]);

  const [prevVisible, setPrevVisible] = useState(visible);
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (visible) {
      setErrorMessage(null);
    }
  }

  // Clean dish name for AI prompt
  const cleanName =
    dishName.replace(/\([^)]*\)/g, '').trim() || dishName.trim() || 'Món ăn dinh dưỡng';

  // 1. TẠO ẢNH BẰNG AI (FLUX/Klein - Đồng bộ logic như Web)
  const handleGenerateAi = async (force: boolean = false) => {
    try {
      setLoadingAi(true);
      setErrorMessage(null);
      const res = await api.post<any>('/api/images/meal-image', {
        mealName: cleanName,
        items: [cleanName],
        aspectRatio: '4:3',
        forceRegenerate: force,
      });

      const url = res?.imageUrl || res?.data?.imageUrl;
      if (url && typeof url === 'string') {
        onSelectImage(url);
        onClose();
      } else {
        throw new Error('Máy chủ chưa trả về đường dẫn ảnh hợp lệ.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Không thể tạo ảnh bằng AI.';
      setErrorMessage(msg);
    } finally {
      setLoadingAi(false);
    }
  };

  // Helper upload ảnh từ thiết bị lên server
  const uploadImageToServer = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    try {
      const mimeType = asset.mimeType || 'image/jpeg';
      const extension = mimeType.includes('png')
        ? 'png'
        : mimeType.includes('webp')
        ? 'webp'
        : 'jpg';

      const safeDishName = cleanName || dishName?.trim() || 'Món ăn';
      const formData = new FormData();
      formData.append('name', safeDishName);
      formData.append('category', 'OTHER');

      if (Platform.OS === 'web') {
        const blob = asset.file || (await (await fetch(asset.uri)).blob());
        formData.append('image', blob.slice(0, blob.size, mimeType), `dish.${extension}`);
      } else {
        formData.append('image', {
          uri: asset.uri,
          name: `dish.${extension}`,
          type: mimeType,
        } as unknown as Blob);
      }

      const uploadRes = await api.upload<any>('/api/food-images/upload', formData);
      const serverUrl =
        uploadRes?.imageUrl ||
        uploadRes?.data?.imageUrl ||
        uploadRes?.url ||
        uploadRes?.data?.url ||
        (typeof uploadRes === 'string' ? uploadRes : null);

      if (serverUrl && typeof serverUrl === 'string') {
        return resolveImageUrl(serverUrl) || serverUrl;
      }
    } catch (uploadErr) {
      // Fallback: nếu upload server gặp lỗi quyền hoặc mạng, vẫn giữ URI thiết bị
      console.warn('Upload food image to server failed, falling back to asset uri:', uploadErr);
    }
    return asset.uri;
  };

  // 2. CHỌN ẢNH TỪ THƯ VIỆN THIẾT BỊ
  const handlePickFromGallery = async () => {
    try {
      setErrorMessage(null);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh món ăn.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const finalUrl = await uploadImageToServer(result.assets[0]);
        onSelectImage(finalUrl);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi chọn ảnh từ thư viện.');
    } finally {
      setUploading(false);
    }
  };

  // 3. CHỤP ẢNH TỪ CAMERA
  const handleCaptureCamera = async () => {
    try {
      setErrorMessage(null);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Ứng dụng cần quyền Camera để chụp ảnh món ăn.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const finalUrl = await uploadImageToServer(result.assets[0]);
        onSelectImage(finalUrl);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi chụp ảnh.');
    } finally {
      setUploading(false);
    }
  };

  // 4. DUYỆT KHO ẢNH HỆ THỐNG
  const handleOpenLibrary = async () => {
    setLibraryVisible(true);
    setLibrarySearch(cleanName);
    await fetchSystemImages(cleanName);
  };

  const fetchSystemImages = async (searchQuery: string) => {
    try {
      setLibraryLoading(true);
      const query = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}&limit=30` : '?limit=30';
      const res = await api.get<any>(`/api/food-images${query}`);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setLibraryItems(list);
    } catch (err) {
      console.warn('Failed to load food images library:', err);
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const resolvedPreview = resolveImageUrl(currentImageUrl);

  return (
    <>
      {/* Action Sheet Modal */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <View style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerLeft}>
                {resolvedPreview ? (
                  <Pressable onPress={() => setZoomVisible(true)} style={styles.thumbWrapper}>
                    <Image source={{ uri: resolvedPreview }} style={styles.thumbImage} resizeMode="cover" />
                    <View style={styles.thumbZoomIcon}>
                      <Eye size={12} color="#FFFFFF" />
                    </View>
                  </Pressable>
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <ImageIcon size={20} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>
                    {dishName || 'Món ăn'}
                  </Text>
                  <Text style={styles.sheetSub}>
                    {currentImageUrl ? 'Đã có ảnh minh họa' : 'Chưa có ảnh món ăn'}
                  </Text>
                </View>
              </View>

              <Pressable hitSlop={8} onPress={onClose} style={styles.closeBtn}>
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Error notice */}
            {errorMessage ? (
              <View style={styles.errorNotice}>
                <Text style={styles.errorNoticeText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Loading Banner */}
            {(loadingAi || uploading) && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingBannerText}>
                  {loadingAi ? 'AI đang thiết kế ảnh ẩm thực chất lượng cao...' : 'Đang xử lý tải ảnh lên...'}
                </Text>
              </View>
            )}

            {/* Actions List */}
            <View style={styles.actionsList}>
              {/* Action 1: Tạo ảnh AI */}
              <Pressable
                style={[styles.actionRow, styles.actionRowAi]}
                disabled={loadingAi || uploading}
                onPress={() => handleGenerateAi(Boolean(currentImageUrl))}
              >
                <View style={styles.actionIconWrapAi}>
                  <Sparkles size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitleAi}>
                    {currentImageUrl ? 'Vẽ lại ảnh món bằng AI' : 'Tạo ảnh món bằng AI'}
                  </Text>
                  <Text style={styles.actionDesc}>
                    Tự động tạo ảnh ẩm thực theo tên món (chuẩn cơm Việt)
                  </Text>
                </View>
              </Pressable>

              {/* Action 2: Thư viện ảnh máy */}
              <Pressable
                style={styles.actionRow}
                disabled={loadingAi || uploading}
                onPress={handlePickFromGallery}
              >
                <View style={styles.actionIconWrapGallery}>
                  <ImageIcon size={18} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Chọn ảnh từ thư viện máy</Text>
                  <Text style={styles.actionDesc}>Tải ảnh có sẵn từ bộ sưu tập điện thoại</Text>
                </View>
              </Pressable>

              {/* Action 3: Chụp ảnh thực tế */}
              <Pressable
                style={styles.actionRow}
                disabled={loadingAi || uploading}
                onPress={handleCaptureCamera}
              >
                <View style={styles.actionIconWrapCamera}>
                  <Camera size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Chụp ảnh món ăn thực tế</Text>
                  <Text style={styles.actionDesc}>Chụp trực tiếp bằng Camera điện thoại</Text>
                </View>
              </Pressable>

              {/* Action 4: Kho ảnh hệ thống */}
              <Pressable
                style={styles.actionRow}
                disabled={loadingAi || uploading}
                onPress={handleOpenLibrary}
              >
                <View style={styles.actionIconWrapLibrary}>
                  <Search size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Chọn từ kho ảnh hệ thống</Text>
                  <Text style={styles.actionDesc}>Tìm kiếm trong thư viện ảnh món đã có</Text>
                </View>
              </Pressable>

              {/* Action 5: Xóa ảnh (nếu đã có) */}
              {currentImageUrl && (
                <Pressable
                  style={[styles.actionRow, styles.actionRowDanger]}
                  disabled={loadingAi || uploading}
                  onPress={() => {
                    if (onRemoveImage) onRemoveImage();
                    onClose();
                  }}
                >
                  <View style={styles.actionIconWrapDanger}>
                    <Trash2 size={16} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitleDanger}>Gỡ ảnh khỏi món này</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Sub-modal: Zoom preview */}
      {zoomVisible && resolvedPreview && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
          <View style={styles.zoomBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setZoomVisible(false)} />
            <View style={styles.zoomCard}>
              <View style={styles.zoomHeader}>
                <Text style={styles.zoomTitle} numberOfLines={1}>
                  {dishName}
                </Text>
                <Pressable hitSlop={8} onPress={() => setZoomVisible(false)} style={styles.zoomCloseBtn}>
                  <X size={20} color="#FFFFFF" />
                </Pressable>
              </View>
              <Image source={{ uri: resolvedPreview }} style={styles.zoomImage} resizeMode="contain" />
            </View>
          </View>
        </Modal>
      )}

      {/* Sub-modal: System Food Images Library */}
      {libraryVisible && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setLibraryVisible(false)}>
          <View style={styles.libraryContainer}>
            {/* Header */}
            <View style={styles.libraryHeader}>
              <Text style={styles.libraryTitle}>Kho ảnh món ăn hệ thống</Text>
              <Pressable hitSlop={8} onPress={() => setLibraryVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#334155" />
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchBarWrap}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                value={librarySearch}
                onChangeText={setLibrarySearch}
                onSubmitEditing={() => fetchSystemImages(librarySearch)}
                placeholder="Tìm ảnh theo tên món ăn..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {librarySearch ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setLibrarySearch('');
                    fetchSystemImages('');
                  }}
                >
                  <X size={15} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            {/* Image Grid */}
            {libraryLoading ? (
              <View style={styles.libraryLoadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.libraryLoadingText}>Đang tải kho ảnh...</Text>
              </View>
            ) : (
              <FlatList
                data={libraryItems}
                keyExtractor={(item) => item._id || item.imageUrl}
                numColumns={2}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.gridRow}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <ImageIcon size={40} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Chưa có ảnh nào phù hợp trong kho.</Text>
                    <Pressable
                      style={styles.emptyAiBtn}
                      onPress={() => {
                        setLibraryVisible(false);
                        handleGenerateAi(false);
                      }}
                    >
                      <Sparkles size={14} color="#FFFFFF" />
                      <Text style={styles.emptyAiBtnText}>Tạo ảnh AI cho món này</Text>
                    </Pressable>
                  </View>
                }
                renderItem={({ item }) => {
                  const resolved = resolveImageUrl(item.imageUrl);
                  if (!resolved) return null;
                  return (
                    <Pressable
                      style={styles.foodImageCard}
                      onPress={() => {
                        onSelectImage(item.imageUrl);
                        setLibraryVisible(false);
                        onClose();
                      }}
                    >
                      <Image source={{ uri: resolved }} style={styles.foodCardImg} resizeMode="cover" />
                      <View style={styles.foodCardMeta}>
                        <Text style={styles.foodCardName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.source && (
                          <Text style={styles.foodCardTag}>{item.source}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.lg,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbWrapper: {
    width: 46,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbZoomIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
  thumbPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#003B70',
  },
  sheetSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  errorNotice: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
  },
  errorNoticeText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  loadingBanner: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingBannerText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '700',
    flex: 1,
  },
  actionsList: {
    marginTop: 14,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  actionRowAi: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  actionRowDanger: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  actionIconWrapAi: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapGallery: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapCamera: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapLibrary: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitleAi: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionTitleDanger: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Zoom modal
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zoomCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
  },
  zoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  zoomTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  zoomCloseBtn: {
    padding: 4,
  },
  zoomImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#000000',
  },

  // Library modal
  libraryContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  libraryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003B70',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  libraryLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  libraryLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  gridContent: {
    padding: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  foodImageCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  foodCardImg: {
    width: '100%',
    height: 110,
    backgroundColor: '#F1F5F9',
  },
  foodCardMeta: {
    padding: 8,
  },
  foodCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  foodCardTag: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAiBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
