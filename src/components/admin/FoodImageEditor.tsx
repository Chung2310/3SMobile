import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { api } from '@/services/api/client';
import { foodFields, foodImagePayload, foodSources, validateFoodImageFile, type FoodImage } from '@/services/adminOperations';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { AdminForm } from './AdminForm';
import { Button, Label, Notice, ui } from './AdminUI';

export function FoodImageEditor({ item, onClose, onSaved }: { item?: FoodImage; onClose: () => void; onSaved: () => void }) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState('');

  const takePhoto = async () => {
    setPicking(true);
    setImageError('');
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        throw new Error('Ứng dụng cần quyền truy cập Camera để chụp ảnh trực tiếp.');
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        const next = result.assets[0];
        validateFoodImageFile(next.mimeType || 'image/jpeg', next.fileSize);
        setAsset(next);
      }
    } catch (cause) {
      setImageError(messageOf(cause));
    } finally {
      setPicking(false);
    }
  };

  const pick = async () => {
    setPicking(true);
    setImageError('');
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        throw new Error('Ứng dụng cần quyền truy cập Thư viện ảnh.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        const next = result.assets[0];
        validateFoodImageFile(next.mimeType || 'image/jpeg', next.fileSize);
        setAsset(next);
      }
    } catch (cause) {
      setImageError(messageOf(cause));
    } finally {
      setPicking(false);
    }
  };

  const preview = asset?.uri || resolveImageUrl(item?.imageUrl);
  return (
    <AdminForm
      title={item ? 'Chỉnh sửa ảnh món ăn' : 'Tải ảnh lên kho'}
      initial={item ? { ...item, keywords: item.keywords?.join(', ') || '' } : {}}
      fields={item ? [...foodFields, { key: 'imageUrl', label: 'Đường dẫn ảnh (HTTP/HTTPS)' }, { key: 'source', label: 'Nguồn ảnh', options: foodSources }, { key: 'usageCount', label: 'Lượt sử dụng', numeric: true, integer: true, min: 0 }] : foodFields}
      extraDirty={Boolean(asset)}
      saveDisabled={picking}
      onClose={onClose}
      extra={
        <View style={ui.gap}>
          {preview ? (
            <Image
              accessibilityLabel="Ảnh món ăn"
              source={{ uri: preview }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chụp ảnh trực tiếp"
              disabled={saving || picking}
              onPress={() => void takePhoto()}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.actionBtnPressed,
                (saving || picking) && { opacity: 0.5 },
              ]}
            >
              <Feather name="camera" size={16} color={colors.primary} />
              <Text style={styles.actionBtnText} numberOfLines={1}>
                Chụp ảnh
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn ảnh từ thư viện"
              disabled={saving || picking}
              onPress={() => void pick()}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.actionBtnPressed,
                (saving || picking) && { opacity: 0.5 },
              ]}
            >
              <Feather name="image" size={16} color={colors.primary} />
              <Text style={styles.actionBtnText} numberOfLines={1}>
                {asset || item ? 'Chọn ảnh khác' : 'Từ thư viện'}
              </Text>
            </Pressable>
          </View>
          {asset ? (
            <Button
              secondary
              label="Bỏ ảnh vừa chọn"
              disabled={saving || picking}
              onPress={() => setAsset(undefined)}
            />
          ) : null}
          <Label muted>Ảnh JPG, PNG hoặc WebP, tối đa 10 MB.</Label>
          {imageError ? <Notice message={imageError} /> : null}
        </View>
      }
      onSave={async (values) => {
        const payload = foodImagePayload(values);
        if (!item && !asset) throw new Error('Vui lòng chọn ảnh để tải lên.');
        setSaving(true);
        try {
          if (asset) {
            const type = validateFoodImageFile(asset.mimeType || 'image/jpeg', asset.fileSize);
            const form = new FormData();
            for (const [key, value] of Object.entries(payload)) form.append(key, String(value));
            const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
            if (Platform.OS === 'web') {
              const blob = asset.file || (await (await fetch(asset.uri)).blob());
              validateFoodImageFile(type, blob.size);
              form.append('image', blob.slice(0, blob.size, type), `food.${extension}`);
            } else {
              form.append('image', { uri: asset.uri, name: `food.${extension}`, type } as unknown as Blob);
            }
            if (item) await api.uploadPatch(`/api/food-images/${item._id}`, form);
            else await api.upload('/api/food-images/upload', form);
          } else if (item) await api.patch(`/api/food-images/${item._id}`, payload);
          onSaved();
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  actionBtnPressed: {
    backgroundColor: '#E0F2FE',
    opacity: 0.85,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
});

