import { useState } from 'react';
import { Image, Platform, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api/client';
import { foodFields, foodImagePayload, foodSources, validateFoodImageFile, type FoodImage } from '@/services/adminOperations';
import { resolveImageUrl } from '@/services/imageUtils';
import { messageOf } from '@/utils/error';
import { AdminForm } from './AdminForm';
import { Button, Label, Notice, ui } from './AdminUI';

export function FoodImageEditor({ item, onClose, onSaved }: { item?: FoodImage; onClose: () => void; onSaved: () => void }) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState('');
  const pick = async () => {
    setPicking(true); setImageError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (!result.canceled && result.assets[0]) {
        const next = result.assets[0];
        validateFoodImageFile(next.mimeType || 'image/jpeg', next.fileSize);
        setAsset(next);
      }
    } catch (cause) { setImageError(messageOf(cause)); }
    finally { setPicking(false); }
  };
  const preview = asset?.uri || resolveImageUrl(item?.imageUrl);
  return <AdminForm title={item ? 'Chỉnh sửa ảnh món ăn' : 'Tải ảnh lên kho'} initial={item ? { ...item, keywords: item.keywords?.join(', ') || '' } : {}}
    fields={item ? [...foodFields, { key:'imageUrl', label:'Đường dẫn ảnh (HTTP/HTTPS)' }, { key:'source', label:'Nguồn ảnh', options:foodSources }, { key:'usageCount', label:'Lượt sử dụng', numeric:true, integer:true, min:0 }] : foodFields}
    extraDirty={Boolean(asset)} saveDisabled={picking} onClose={onClose}
    extra={<View style={ui.gap}>{preview && <Image accessibilityLabel="Ảnh món ăn" source={{ uri: preview }} style={{ width:'100%', height:220, borderRadius:16 }} resizeMode="contain" />}<Button secondary label={asset || item ? 'Chọn ảnh thay thế' : 'Chọn ảnh từ điện thoại'} busy={picking} disabled={saving} onPress={() => void pick()} />{asset && <Button secondary label="Bỏ ảnh vừa chọn" disabled={saving} onPress={() => setAsset(undefined)} />}<Label muted>Ảnh JPG, PNG hoặc WebP, tối đa 10 MB.</Label>{imageError && <Notice message={imageError} />}</View>}
    onSave={async values => {
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
            const blob = asset.file || await (await fetch(asset.uri)).blob();
            validateFoodImageFile(type, blob.size);
            form.append('image', blob.slice(0, blob.size, type), `food.${extension}`);
          } else {
            form.append('image', { uri:asset.uri, name:`food.${extension}`, type } as unknown as Blob);
          }
          if (item) await api.uploadPatch(`/api/food-images/${item._id}`, form);
          else await api.upload('/api/food-images/upload', form);
        } else if (item) await api.patch(`/api/food-images/${item._id}`, payload);
        onSaved();
      } finally { setSaving(false); }
    }} />;
}
