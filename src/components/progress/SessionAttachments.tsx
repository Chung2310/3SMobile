import { useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { api, ApiError } from '@/services/api/client';
import { MAX_PROGRESS_PHOTO_BYTES, progressPhotoFormData } from '@/services/progressPhotoUpload';
import { colors } from '@/theme';
import { asRecord, asRecords, readText } from '@/services/journey';
import { MEASUREMENTS } from '@/services/progress';
import { resolveImageUrl } from '@/services/imageUtils';
import type { JsonRecord } from '@/types/domain';
import { Button, Field, Notice, Picker, Sheet } from '../workouts/Controls';
import { ProgressNotice } from './ProgressNotice';

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bufferLength = base64.length * 0.75;
  const len = base64.endsWith('==') ? bufferLength - 2 : base64.endsWith('=') ? bufferLength - 1 : bufferLength;
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== -1 && encoded3 !== 64) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== -1 && encoded4 !== 64) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

export function SessionAttachments({
  value,
  onChange,
  onBusy,
}: {
  value: JsonRecord;
  onChange: (value: JsonRecord) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [measure, setMeasure] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  const photos = asRecords(value.progressPhotos);
  const body = asRecord(value.bodyMeasurement);

  async function pick(camera: boolean) {
    if (lock.current || photos.length >= 4) return;
    lock.current = true;
    setError('');
    setUploading(true);
    onBusy(true);

    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Cần cấp quyền camera để chụp ảnh tiến độ.');
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Cần cấp quyền truy cập thư viện ảnh.');
        }
      }

      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.6,
            allowsEditing: false,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.6,
            allowsEditing: false,
            base64: true,
          });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      let mimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('Chỉ hỗ trợ định dạng JPG, PNG hoặc WebP.');
      }

      if (asset.fileSize && asset.fileSize > MAX_PROGRESS_PHOTO_BYTES) {
        throw new Error('Ảnh không được vượt quá 5 MB.');
      }


      // Convert image to Blob compatible with Expo WinterCG fetch (avoids Unsupported FormDataPart implementation error)
      let blob: Blob;
      try {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      } catch {
        if (asset.base64) {
          const bytes = base64ToUint8Array(asset.base64);
          blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
        } else {
          throw new Error('Không thể đọc dữ liệu ảnh chụp từ thiết bị.');
        }
      }

      const data = progressPhotoFormData(blob, mimeType);

      const uploaded = await api.upload<{ url: string }>('/api/upload/image', data);
      if (!uploaded?.url) {
        throw new Error('Máy chủ chưa trả đường dẫn ảnh tải lên.');
      }

      setLocalPreviews((current) => ({ ...current, [uploaded.url]: asset.uri }));
      onChange({
        ...value,
        progressPhotos: [...photos, { photoUrl: uploaded.url, angle: 'FRONT' }],
      });
    } catch (e) {
      console.error('[Upload Progress Photo Error]', e);
      const details = e instanceof ApiError
        ? asRecords(e.errors).map((issue) => readText(issue, ['message'])).filter(Boolean).join('\n')
        : '';
      setError(details || (e instanceof Error ? e.message : 'Không tải được ảnh lên máy chủ.'));
    } finally {
      lock.current = false;
      setUploading(false);
      onBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Body Measurements Toggle */}
      <Button
        secondary
        icon="activity"
        label={measure ? 'Ẩn số đo cùng buổi' : 'Thêm số đo cùng buổi (tùy chọn)'}
        onPress={() => setMeasure(!measure)}
      />

      {measure && (
        <View style={styles.measureBox}>
          <Text style={styles.sectionSubTitle}>SỐ ĐO CƠ THỂ BUỔI NÀY</Text>
          {MEASUREMENTS.map(([key, label, unit]) => (
            <Field
              key={key}
              numeric
              label={`${label} (${unit})`}
              value={String(body[key] ?? '')}
              onChange={(v) =>
                onChange({ ...value, bodyMeasurement: { ...body, [key]: v } })
              }
            />
          ))}
        </View>
      )}

      {/* Progress Photos Section */}
      <View style={styles.photoHeaderRow}>
        <Text style={styles.sectionTitle}>Ảnh tiến độ ({photos.length}/4)</Text>
      </View>
      <Notice text="Ảnh sẽ được tải lên máy chủ bảo mật và liên kết trực tiếp vào lịch sử buổi tập của học viên." />

      {photos.map((photo, index) => {
        const rawUrl = readText(photo, ['photoUrl']);
        const resolvedUrl = resolveImageUrl(rawUrl) || rawUrl;
        return (
          <View key={index} style={styles.photoItemCard}>
            <ProgressPhotoPreview
              key={rawUrl}
              localUri={localPreviews[rawUrl]}
              remoteUri={resolvedUrl}
              label={`Ảnh tiến độ ${index + 1}`}
            />
            <Picker
              label="Góc chụp"
              value={readText(photo, ['angle'])}
              options={{
                FRONT: 'Mặt trước',
                SIDE: 'Mặt bên',
                BACK: 'Mặt sau',
                OTHER: 'Khác',
              }}
              onChange={(angle) =>
                onChange({
                  ...value,
                  progressPhotos: photos.map((p, i) =>
                    i === index ? { ...p, angle } : p
                  ),
                })
              }
            />
            <Button
              secondary
              destructive
              icon="trash-2"
              label="Xóa ảnh này"
              disabled={uploading}
              onPress={() =>
                onChange({
                  ...value,
                  progressPhotos: photos.filter((_, i) => i !== index),
                })
              }
            />
          </View>
        );
      })}

      <View style={styles.photoButtonsRow}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            icon="image"
            label="Từ thư viện"
            busy={uploading}
            disabled={photos.length >= 4}
            onPress={() => void pick(false)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            icon="camera"
            label="Chụp ảnh"
            busy={uploading}
            disabled={photos.length >= 4}
            onPress={() => void pick(true)}
          />
        </View>
      </View>

      {/* Signature Section */}
      <Button
        secondary
        icon="edit-3"
        label={
          value.customerSignature
            ? 'Ký lại xác nhận của học viên'
            : 'Học viên ký xác nhận (tùy chọn)'
        }
        disabled={uploading}
        onPress={() => setSigning(true)}
      />

      {!!value.customerSignature && (
        <View style={styles.signatureCard}>
          <Image
            source={{ uri: readText(asRecord(value.customerSignature), ['signatureUrl']) }}
            style={styles.signaturePreview}
            resizeMode="contain"
            accessibilityLabel="Chữ ký học viên"
          />
          <Button
            secondary
            destructive
            label="Bỏ chữ ký"
            onPress={() => onChange({ ...value, customerSignature: undefined })}
          />
        </View>
      )}

      {signing && (
        <Signature
          onClose={() => setSigning(false)}
          onSave={(signature) => {
            onChange({ ...value, customerSignature: signature });
            setSigning(false);
          }}
        />
      )}

      <ProgressNotice message={error} error onClose={() => setError('')} />
    </View>
  );
}

function ProgressPhotoPreview({ localUri, remoteUri, label }: {
  localUri?: string;
  remoteUri: string;
  label: string;
}) {
  const [uri, setUri] = useState(localUri || remoteUri);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.previewImage}>
        {!failed && <Image
          key={`${uri}-${attempt}`}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel={label}
          onLoad={() => setLoading(false)}
          onError={() => {
            if (uri !== remoteUri) {
              setUri(remoteUri);
              setLoading(true);
            } else {
              setLoading(false);
              setFailed(true);
            }
          }}
        />}
        {loading && <View style={styles.previewStatus}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textMuted }}>Đang tải ảnh...</Text>
        </View>}
        {failed && <View style={styles.previewStatus}>
          <Notice error text="Không tải được ảnh xem trước." />
        </View>}
      </View>
      {failed && <Button secondary icon="refresh-cw" label="Thử tải lại ảnh" onPress={() => {
        setUri(localUri || remoteUri);
        setFailed(false);
        setLoading(true);
        setAttempt((current) => current + 1);
      }} />}
    </View>
  );
}
function Signature({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (value: JsonRecord) => void;
}) {
  const svg = useRef<Svg>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [width, setWidth] = useState(300);
  const [error, setError] = useState('');

  return (
    <Sheet title="Học viên ký xác nhận" onClose={onClose}>
      <Notice text="Học viên tự ký trực tiếp trong khung bên dưới để xác nhận hoàn thành buổi tập." />
      <Field
        label="Họ và tên người ký"
        placeholder="Nhập tên học viên..."
        value={name}
        onChange={setName}
      />
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.canvasContainer}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          setPaths((old) => [...old, `M${x},${y} l0.1,0.1`]);
        }}
        onResponderMove={(e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          setPaths((old) =>
            old.map((p, i) =>
              i === old.length - 1
                ? `${p} L${Math.max(0, Math.min(width, x))},${Math.max(0, Math.min(200, y))}`
                : p
            )
          );
        }}
      >
        <Svg ref={svg} pointerEvents="none" width="100%" height={200} viewBox={`0 0 ${width} 200`}>
          <Rect width={width} height={200} fill="#FFFFFF" />
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke={colors.text} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          ))}
        </Svg>
      </View>
      {!!error && <Notice error text={error} />}
      <View style={styles.signatureActions}>
        <View style={{ flex: 1 }}>
          <Button secondary label="Xóa và ký lại" onPress={() => setPaths([])} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Xác nhận"
            disabled={!paths.length}
            onPress={() => {
              try {
                svg.current?.toDataURL((data) => {
                  if (!data) {
                    setError('Không đọc được chữ ký. Vui lòng ký lại.');
                    return;
                  }
                  onSave({
                    signatureUrl: `data:image/png;base64,${data}`,
                    signedAt: new Date().toISOString(),
                    signerName: name.trim(),
                  });
                });
              } catch {
                setError('Không xuất được chữ ký trên thiết bị này.');
              }
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  measureBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoItemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  previewStatus: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  signatureCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  signaturePreview: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  canvasContainer: {
    height: 200,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  signatureActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
