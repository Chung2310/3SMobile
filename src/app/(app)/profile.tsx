import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/context/AuthContext';
import {
  fetchPtProfile,
  updatePtProfile,
  uploadPtAvatar,
  type PtProfileInfo,
  type UpdateProfilePayload,
} from '@/services/ptProfileService';
import { resolveImageUrl } from '@/services/imageUtils';
import { DatePickerModal } from '@/components/DatePickerModal';
import { AppAlertModal, type AlertModalType } from '@/components/AppAlertModal';
import { canAccessAdmin } from '@/services/adminAccess';
import { colors, radius, spacing } from '@/theme';

interface ProfileFormState {
  avatarUrl: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  address: string;
  specialization: string;
  yearsOfExperience: string;
  certificates: string;
  bio: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const initialForm: ProfileFormState = {
  avatarUrl: '',
  fullName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  gender: 'OTHER',
  address: '',
  specialization: '',
  yearsOfExperience: '0',
  certificates: '',
  bio: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const formatDateDisplay = (isoStr?: string | null): string => {
  if (!isoStr) return 'Chưa cập nhật';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getGenderLabel = (val?: string | null): string => {
  if (val === 'MALE') return 'Nam';
  if (val === 'FEMALE') return 'Nữ';
  return 'Khác';
};

const isSixDigitPassword = (val: string) => /^\d{6}$/.test(val.trim());

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<PtProfileInfo | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Bottom sheet state for editing profile & security
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [sheetTab, setSheetTab] = useState<'profile' | 'security'>('profile');

  // Password view toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type?: AlertModalType;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });


  const applyProfileToForm = (data: PtProfileInfo) => {
    setForm((prev) => ({
      ...prev,
      avatarUrl: data.avatarUrl || '',
      fullName: data.fullName || '',
      phone: data.phone || '',
      email: data.email || '',
      dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '',
      gender: (data.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'OTHER',
      address: data.address || '',
      specialization: data.specialization || '',
      yearsOfExperience: String(data.yearsOfExperience ?? 0),
      certificates: Array.isArray(data.certificates)
        ? data.certificates.join('\n')
        : (data.certificates as string) || '',
      bio: data.bio || '',
    }));
  };

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchPtProfile(session?.user);
      setProfile(data);
      applyProfileToForm(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadProfile();
  }, [loadProfile]);

  // Image actions
  const handleTakePhoto = async () => {
    setShowPhotoPickerModal(false);
    try {
      const current = await ImagePicker.getCameraPermissionsAsync();
      let granted = current.granted;
      if (!granted) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        granted = perm.granted;
      }
      if (!granted) {
        setAlertConfig({
          visible: true,
          type: 'warning',
          title: 'Cần quyền Camera',
          message: 'Vui lòng cấp quyền Camera trong cài đặt để chụp ảnh đại diện.',
          onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        await handleUploadAvatarAsset(res.assets[0]);
      }
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Lỗi máy ảnh',
        message: err?.message || 'Không thể chụp ảnh. Vui lòng thử lại.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handlePickPhoto = async () => {
    setShowPhotoPickerModal(false);
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      let granted = current.granted;
      if (!granted) {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = perm.granted;
      }
      if (!granted) {
        setAlertConfig({
          visible: true,
          type: 'warning',
          title: 'Cần quyền Thư viện',
          message: 'Vui lòng cấp quyền truy cập Thư viện ảnh để chọn ảnh đại diện.',
          onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        await handleUploadAvatarAsset(res.assets[0]);
      }
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Lỗi thư viện ảnh',
        message: err?.message || 'Không thể chọn ảnh. Vui lòng thử lại.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleUploadAvatarAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setUploadingAvatar(true);
      const url = await uploadPtAvatar({
        uri: asset.uri,
        fileName: asset.fileName || 'avatar.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
        base64: asset.base64,
      });

      // Lưu ngay vào hồ sơ PT
      await updatePtProfile({ avatarUrl: url });
      setForm((prev) => ({ ...prev, avatarUrl: url }));
      await refreshProfile();
      await loadProfile();

      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Thành công',
        message: 'Tải ảnh đại diện thành công!',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Lỗi tải ảnh',
        message: err?.message || 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleConfirmDeleteAvatar = () => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: 'Xóa ảnh đại diện?',
      message: 'Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại?',
      confirmLabel: 'Xóa ảnh',
      cancelLabel: 'Hủy',
      onConfirm: async () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        try {
          setUploadingAvatar(true);
          await updatePtProfile({ avatarUrl: null });
          setForm((prev) => ({ ...prev, avatarUrl: '' }));
          await refreshProfile();
          await loadProfile();
          setAlertConfig({
            visible: true,
            type: 'success',
            title: 'Đã xóa',
            message: 'Đã xóa ảnh đại diện thành công.',
            onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
        } catch (err: any) {
          setAlertConfig({
            visible: true,
            type: 'error',
            title: 'Lỗi',
            message: err?.message || 'Không thể xóa ảnh đại diện.',
            onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
        } finally {
          setUploadingAvatar(false);
        }
      },
      onCancel: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    });
  };

  // Submit Profile & Expertise (Tab 1 in Sheet)
  const handleSaveProfile = async () => {
    if (!form.fullName.trim()) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập họ và tên.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (!form.phone.trim()) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập số điện thoại.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const payload: UpdateProfilePayload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      address: form.address.trim() || '',
      specialization: form.specialization.trim() || '',
      yearsOfExperience: Number(form.yearsOfExperience || 0),
      certificates: form.certificates
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      bio: form.bio.trim() || '',
    };

    try {
      setSubmitting(true);
      await updatePtProfile(payload);
      await refreshProfile();
      await loadProfile();
      setShowEditSheet(false);

      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Thành công',
        message: 'Cập nhật thông tin hồ sơ thành công!',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Lỗi cập nhật',
        message: err?.message || 'Không thể lưu thông tin. Vui lòng thử lại.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Password Change (Tab 2 in Sheet)
  const handleSavePassword = async () => {
    if (!form.currentPassword) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (!isSixDigitPassword(form.newPassword)) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Mật khẩu không hợp lệ',
        message: 'Mật khẩu mới phải gồm đúng 6 chữ số (ví dụ: 123456).',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setAlertConfig({
        visible: true,
        type: 'warning',
        title: 'Mật khẩu không khớp',
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    try {
      setSubmitting(true);
      await updatePtProfile({
        currentPassword: form.currentPassword,
        password: form.newPassword,
      });

      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setShowEditSheet(false);

      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Đổi mật khẩu thành công',
        message: 'Mật khẩu mới đã được cập nhật thành công.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Lỗi đổi mật khẩu',
        message: err?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: 'Đăng xuất tài khoản',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng 3S Gym?',
      confirmLabel: 'Đăng xuất',
      cancelLabel: 'Hủy',
      onConfirm: async () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        await signOut();
        router.replace('/(auth)/login');
      },
      onCancel: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const displayName = profile?.fullName || session?.user?.fullName || session?.user?.username || 'Huấn luyện viên';
  const username = profile?.username || session?.user?.username || 'pt';
  const avatarUrl = profile?.avatarUrl || (session?.user?.avatarUrl as string) || '';
  const yearsExp = Number(profile?.yearsOfExperience) || 0;
  const spec = profile?.specialization || '';
  const totalCustomers = profile?.totalCustomers ?? 0;
  const goodProgress = profile?.goodProgressCount ?? 0;
  const alerts = profile?.openAlerts ?? 0;

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP BAR */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.navigate('/(app)/(tabs)')}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel="Quay lại"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Hồ sơ cá nhân</Text>
          <Text style={styles.topBarSubtitle}>Huấn luyện viên 3S</Text>
        </View>

        {/* Nút sửa nhanh trên Top Bar */}
        <Pressable
          onPress={() => {
            if (profile) applyProfileToForm(profile);
            setSheetTab('profile');
            setShowEditSheet(true);
          }}
          hitSlop={12}
          style={({ pressed }) => [styles.topEditBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel="Sửa hồ sơ"
        >
          <Feather name="edit-3" size={18} color="#0284C7" />
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(insets.bottom, 24) + 120
                : Math.max(insets.bottom, 16) + 80,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0284C7']}
            tintColor={'#0284C7'}
          />
        }
      >
        {loading && !profile ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#0284C7" />
            <Text style={styles.loadingText}>Đang tải dữ liệu hồ sơ từ hệ thống...</Text>
          </View>
        ) : (
          <>
            {/* 2. CARD HỒ SƠ HLV CHÍNH (GỌN GÀNG, SANG TRỌNG) */}
            <View style={styles.profileHeroCard}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarCircle}>
                  {avatarUrl ? (
                    <Image source={{ uri: resolveImageUrl(avatarUrl) || '' }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {displayName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {uploadingAvatar && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </View>

                {/* Nút Camera để đổi avatar */}
                <Pressable
                  style={({ pressed }) => [styles.cameraBtn, pressed && styles.cameraBtnPressed]}
                  onPress={() => setShowPhotoPickerModal(true)}
                  disabled={uploadingAvatar}
                  hitSlop={8}
                  accessibilityLabel="Đổi ảnh đại diện"
                >
                  <Feather name="camera" size={16} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Nút Xóa ảnh đại diện */}
              {Boolean(avatarUrl) && (
                <Pressable
                  style={styles.deleteAvatarBtn}
                  onPress={handleConfirmDeleteAvatar}
                  disabled={uploadingAvatar}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={12} color="#EF4444" />
                  <Text style={styles.deleteAvatarText}>Xóa ảnh đại diện</Text>
                </Pressable>
              )}

              {/* TÊN HLV KÈM ICON CÂY BÚT ĐỂ SỬA */}
              <View style={styles.nameRow}>
                <Text style={styles.ptFullName}>{displayName}</Text>
                <Pressable
                  style={({ pressed }) => [styles.editNameBtn, pressed && styles.editNameBtnPressed]}
                  onPress={() => {
                    if (profile) applyProfileToForm(profile);
                    setSheetTab('profile');
                    setShowEditSheet(true);
                  }}
                  hitSlop={10}
                  accessibilityLabel="Chỉnh sửa thông tin"
                >
                  <Feather name="edit-2" size={16} color="#0284C7" />
                </Pressable>
              </View>

              <View style={styles.rolePill}>
                <Feather name="shield" size={12} color="#0284C7" />
                <Text style={styles.rolePillText}>HUẤN LUYỆN VIÊN 3S</Text>
              </View>

              <Text style={styles.ptUsername}>@{username}</Text>

              {/* Hàng chỉ số tóm tắt hoạt động */}
              <View style={styles.statsStrip}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalCustomers}</Text>
                  <Text style={styles.statLabel}>Học viên</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#16A34A' }]}>{goodProgress}</Text>
                  <Text style={styles.statLabel}>Tiến độ tốt</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: alerts > 0 ? '#EF4444' : '#64748B' }]}>
                    {alerts}
                  </Text>
                  <Text style={styles.statLabel}>Cảnh báo</Text>
                </View>
              </View>
            </View>

            {/* 3. KHỐI THÔNG TIN CƠ BẢN (XEM TRỰC DIỆN) */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoCardHeaderLeft}>
                  <Feather name="user" size={16} color="#0284C7" />
                  <Text style={styles.infoCardTitle}>THÔNG TIN CƠ BẢN</Text>
                </View>

                <Pressable
                  onPress={() => {
                    if (profile) applyProfileToForm(profile);
                    setSheetTab('profile');
                    setShowEditSheet(true);
                  }}
                  hitSlop={8}
                  style={styles.cardHeaderAction}
                >
                  <Feather name="edit" size={14} color="#0284C7" />
                  <Text style={styles.cardHeaderActionText}>Sửa</Text>
                </Pressable>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Số điện thoại</Text>
                <Text style={styles.infoVal}>{profile?.phone || 'Chưa cập nhật'}</Text>
              </View>
              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Email</Text>
                <Text style={styles.infoVal} numberOfLines={1}>{profile?.email || 'Chưa cập nhật'}</Text>
              </View>
              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Ngày sinh</Text>
                <Text style={styles.infoVal}>{formatDateDisplay(profile?.dateOfBirth)}</Text>
              </View>
              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Giới tính</Text>
                <Text style={styles.infoVal}>{getGenderLabel(profile?.gender)}</Text>
              </View>
              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Địa chỉ cư trú</Text>
                <Text style={styles.infoVal} numberOfLines={1}>{profile?.address || 'Chưa cập nhật'}</Text>
              </View>
            </View>

            {/* 4. KHỐI HỒ SƠ CHUYÊN MÔN HLV */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.infoCardHeaderLeft}>
                  <Feather name="award" size={16} color="#0284C7" />
                  <Text style={styles.infoCardTitle}>HỒ SƠ CHUYÊN MÔN</Text>
                </View>

                <Pressable
                  onPress={() => {
                    if (profile) applyProfileToForm(profile);
                    setSheetTab('profile');
                    setShowEditSheet(true);
                  }}
                  hitSlop={8}
                  style={styles.cardHeaderAction}
                >
                  <Feather name="edit" size={14} color="#0284C7" />
                  <Text style={styles.cardHeaderActionText}>Sửa</Text>
                </Pressable>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Chuyên môn</Text>
                <Text style={styles.infoVal}>{spec || 'Chưa cập nhật'}</Text>
              </View>
              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Kinh nghiệm</Text>
                <Text style={styles.infoVal}>
                  {yearsExp > 0 ? `${yearsExp} năm thực tế` : 'Chưa cập nhật'}
                </Text>
              </View>
              <View style={styles.rowDivider} />

              <View style={styles.verticalInfoRow}>
                <Text style={styles.infoKey}>Bằng cấp & Chứng chỉ</Text>
                {Array.isArray(profile?.certificates) && profile.certificates.length > 0 ? (
                  <View style={styles.certificatesWrap}>
                    {profile.certificates.map((c, i) => (
                      <View key={i} style={styles.certBadge}>
                        <Feather name="check" size={12} color="#0284C7" />
                        <Text style={styles.certText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoEmptyText}>Chưa cập nhật chứng chỉ</Text>
                )}
              </View>
              <View style={styles.rowDivider} />

              <View style={styles.verticalInfoRow}>
                <Text style={styles.infoKey}>Giới thiệu bản thân & Triết lý</Text>
                <Text style={styles.bioText}>
                  {profile?.bio || 'Chưa cập nhật phần giới thiệu cá nhân.'}
                </Text>
              </View>
            </View>

            {/* NÚT CHUYỂN SANG TRANG QUẢN TRỊ (KHI CÓ QUYỀN ADMIN) */}
            {canAccessAdmin(session?.user) && (
              <Pressable
                style={({ pressed }) => [styles.adminBarBtn, pressed && styles.securityBarBtnPressed]}
                onPress={() => router.push('/(app)/admin')}
                accessibilityRole="button"
                accessibilityLabel="Chuyển sang trang Quản trị"
              >
                <View style={styles.securityBarLeft}>
                  <View style={[styles.securityIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="shield-checkmark" size={17} color="#0284C7" />
                  </View>
                  <View>
                    <Text style={styles.securityBarTitle}>Trang Quản trị hệ thống</Text>
                    <Text style={styles.adminBarSub}>Quản lý tài khoản, khách hàng & tài chính</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            )}

            {/* 5. NÚT MỞ NHANH BẢO MẬT & ĐỔI MẬT KHẨU */}
            <Pressable
              style={({ pressed }) => [styles.securityBarBtn, pressed && styles.securityBarBtnPressed]}
              onPress={() => {
                setSheetTab('security');
                setShowEditSheet(true);
              }}
            >
              <View style={styles.securityBarLeft}>
                <View style={styles.securityIconCircle}>
                  <Feather name="lock" size={16} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.securityBarTitle}>Bảo mật & Đổi mật khẩu</Text>
                  
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>

            {/* 6. HÀNH ĐỘNG HỆ THỐNG (ĐĂNG XUẤT) */}
            <View style={styles.systemCard}>
              <Text style={styles.systemHeading}>HỆ THỐNG</Text>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.signOutBtn,
                  pressed && styles.signOutBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Đăng xuất tài khoản"
              >
                <Feather name="log-out" size={18} color="#EF4444" />
                <Text style={styles.signOutText}>Đăng xuất tài khoản</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* 7. BOTTOM SHEET SỬA HỒ SƠ & ĐỔI MẬT KHẨU (SLIDE-UP SHEET) */}
      <Modal
        visible={showEditSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetBackdrop}
        >
          {/* Vùng mờ ngoài sheet - bấm để đóng */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowEditSheet(false)}
            accessibilityLabel="Đóng sheet"
          />

          <View style={styles.sheetContainer}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.sheetIconCircle}>
                  <Feather
                    name={sheetTab === 'profile' ? 'edit-3' : 'shield'}
                    size={18}
                    color="#0284C7"
                  />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>
                    {sheetTab === 'profile' ? 'Chỉnh sửa hồ sơ' : 'Bảo mật & Đổi mật khẩu'}
                  </Text>
                  <Text style={styles.sheetSubtitle}>{displayName}</Text>
                </View>
              </View>

              <Pressable
                style={styles.sheetCloseBtn}
                onPress={() => setShowEditSheet(false)}
                hitSlop={12}
              >
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* 2 Tabs chuyển đổi trong Sheet */}
            <View style={styles.sheetTabBar}>
              <Pressable
                style={[styles.sheetTabBtn, sheetTab === 'profile' && styles.sheetTabBtnActive]}
                onPress={() => setSheetTab('profile')}
              >
                <Feather
                  name="user"
                  size={14}
                  color={sheetTab === 'profile' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.sheetTabBtnText,
                    sheetTab === 'profile' && styles.sheetTabBtnTextActive,
                  ]}
                >
                  Hồ sơ & Chuyên môn
                </Text>
              </Pressable>

              <Pressable
                style={[styles.sheetTabBtn, sheetTab === 'security' && styles.sheetTabBtnActive]}
                onPress={() => setSheetTab('security')}
              >
                <Feather
                  name="lock"
                  size={14}
                  color={sheetTab === 'security' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.sheetTabBtnText,
                    sheetTab === 'security' && styles.sheetTabBtnTextActive,
                  ]}
                >
                  Đổi mật khẩu
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* TAB 1 TRONG SHEET: THÔNG TIN HỒ SƠ & CHUYÊN MÔN */}
              {sheetTab === 'profile' && (
                <View>
                  {/* Tiêu đề nhóm 1 */}
                  <View style={styles.sheetSectionTitleRow}>
                    <Feather name="user" size={15} color="#0284C7" />
                    <Text style={styles.sheetSectionTitle}>THÔNG TIN CƠ BẢN</Text>
                  </View>

                  {/* Họ và tên */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Họ và tên <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.fullName}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, fullName: val }))}
                      placeholder="Ví dụ: Nguyễn Xuân Son"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Số điện thoại */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Số điện thoại <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.phone}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, phone: val }))}
                      placeholder="Ví dụ: 0988727662"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Email liên hệ */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email liên hệ</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.email}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, email: val }))}
                      placeholder="pt@3sgym.vn"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Ngày sinh */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ngày sinh</Text>
                    <Pressable
                      style={styles.datePickerBtn}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text
                        style={[
                          styles.datePickerText,
                          !form.dateOfBirth && { color: colors.textMuted },
                        ]}
                      >
                        {formatDateDisplay(form.dateOfBirth)}
                      </Text>
                      <Feather name="calendar" size={16} color="#0284C7" />
                    </Pressable>
                  </View>

                  {/* Giới tính */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Giới tính</Text>
                    <View style={styles.genderRow}>
                      {[
                        { label: 'Nam', val: 'MALE' as const },
                        { label: 'Nữ', val: 'FEMALE' as const },
                        { label: 'Khác', val: 'OTHER' as const },
                      ].map((item) => {
                        const isSelected = form.gender === item.val;
                        return (
                          <Pressable
                            key={item.val}
                            style={[
                              styles.genderPill,
                              isSelected && styles.genderPillSelected,
                            ]}
                            onPress={() => setForm((prev) => ({ ...prev, gender: item.val }))}
                          >
                            <Text
                              style={[
                                styles.genderPillText,
                                isSelected && styles.genderPillTextSelected,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Địa chỉ cư trú */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Địa chỉ cư trú</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.address}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, address: val }))}
                      placeholder="Thành phố Bắc Ninh..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Tiêu đề nhóm 2 */}
                  <View style={[styles.sheetSectionTitleRow, { marginTop: 14 }]}>
                    <Feather name="briefcase" size={15} color="#0284C7" />
                    <Text style={styles.sheetSectionTitle}>HỒ SƠ CHUYÊN MÔN HLV</Text>
                  </View>

                  {/* Lĩnh vực chuyên môn */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Lĩnh vực chuyên môn</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.specialization}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, specialization: val }))}
                      placeholder="Gym, Kickfit, Tăng cơ giảm mỡ..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Số năm kinh nghiệm */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Số năm kinh nghiệm</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.yearsOfExperience}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, yearsOfExperience: val }))}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>

                  {/* Bằng cấp & Chứng chỉ */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bằng cấp & Chứng chỉ </Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={form.certificates}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, certificates: val }))}
                      placeholder="Chứng chỉ HLV Thể hình Quốc Gia&#10;Chứng chỉ Dinh Dưỡng Thể Thao ISSA..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Giới thiệu bản thân */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Giới thiệu bản thân & Triết lý huấn luyện </Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea, { minHeight: 90 }]}
                      value={form.bio}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, bio: val }))}
                      placeholder="Giới thiệu đôi nét về bản thân và phương châm tập luyện..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Nút lưu */}
                  <Pressable
                    style={[styles.sheetSubmitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSaveProfile}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="save" size={16} color="#FFFFFF" />
                        <Text style={styles.sheetSubmitBtnText}>Lưu thay đổi hồ sơ</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}

              {/* TAB 2 TRONG SHEET: ĐỔI MẬT KHẨU */}
              {sheetTab === 'security' && (
                <View>
                  {/* Quy tắc mật khẩu */}
                  <View style={styles.passwordRuleBox}>
                    <View style={styles.passwordRuleHeader}>
                      <Feather name="lock" size={15} color="#0284C7" />
                      <Text style={styles.passwordRuleTitle}>Quy tắc mật khẩu</Text>
                    </View>
                    <Text style={styles.passwordRuleDesc}>
                      Mật khẩu tối thiểu 6 kí tự. Vui lòng nhập mật khẩu hiện tại trước khi đổi sang mật khẩu mới.
                    </Text>
                  </View>

                  {/* Mật khẩu hiện tại */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Mật khẩu hiện tại <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.passwordInputWrap}>
                      <TextInput
                        style={styles.passwordInput}
                        value={form.currentPassword}
                        onChangeText={(val) => setForm((prev) => ({ ...prev, currentPassword: val }))}
                        placeholder="Nhập mật khẩu hiện tại..."
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showCurrentPassword}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <Pressable
                        style={styles.eyeBtn}
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        hitSlop={8}
                      >
                        <Feather
                          name={showCurrentPassword ? 'eye-off' : 'eye'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Mật khẩu mới */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Mật khẩu mới (tối thiểu 6 kí tự) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.passwordInputWrap}>
                      <TextInput
                        style={styles.passwordInput}
                        value={form.newPassword}
                        onChangeText={(val) => setForm((prev) => ({ ...prev, newPassword: val }))}
                        placeholder="Nhập mật khẩu mới..."
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showNewPassword}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <Pressable
                        style={styles.eyeBtn}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        hitSlop={8}
                      >
                        <Feather
                          name={showNewPassword ? 'eye-off' : 'eye'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Xác nhận mật khẩu mới */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Xác nhận mật khẩu mới <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.passwordInputWrap}>
                      <TextInput
                        style={styles.passwordInput}
                        value={form.confirmPassword}
                        onChangeText={(val) => setForm((prev) => ({ ...prev, confirmPassword: val }))}
                        placeholder="Nhập lại mật khẩu mới..."
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showConfirmPassword}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <Pressable
                        style={styles.eyeBtn}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={8}
                      >
                        <Feather
                          name={showConfirmPassword ? 'eye-off' : 'eye'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Nút cập nhật mật khẩu */}
                  <Pressable
                    style={[styles.sheetSubmitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSavePassword}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={16} color="#FFFFFF" />
                        <Text style={styles.sheetSubmitBtnText}>Xác nhận đổi mật khẩu</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL CHỌN NGUỒN ẢNH (CAMERA / GALLERY) */}
      <Modal
        visible={showPhotoPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoPickerModal(false)}
      >
        <Pressable
          style={styles.photoModalBackdrop}
          onPress={() => setShowPhotoPickerModal(false)}
        >
          <View style={styles.photoModalCard}>
            <Text style={styles.photoModalTitle}>Thay đổi ảnh đại diện</Text>

            <Pressable
              style={({ pressed }) => [styles.photoModalItem, pressed && styles.photoModalItemPressed]}
              onPress={handleTakePhoto}
            >
              <View style={[styles.photoModalIcon, { backgroundColor: '#E0F2FE' }]}>
                <Feather name="camera" size={18} color="#0284C7" />
              </View>
              <Text style={styles.photoModalText}>Chụp ảnh mới</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.photoModalItem, pressed && styles.photoModalItemPressed]}
              onPress={handlePickPhoto}
            >
              <View style={[styles.photoModalIcon, { backgroundColor: '#DCFCE7' }]}>
                <Feather name="image" size={18} color="#16A34A" />
              </View>
              <Text style={styles.photoModalText}>Chọn từ thư viện ảnh</Text>
            </Pressable>

            <Pressable
              style={styles.photoModalCancel}
              onPress={() => setShowPhotoPickerModal(false)}
            >
              <Text style={styles.photoModalCancelText}>Hủy</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* MODAL DATE PICKER CHO NGÀY SINH */}
      <DatePickerModal
        visible={showDatePicker}
        value={form.dateOfBirth || ''}
        title="Chọn ngày sinh"
        maxDate={new Date()}
        onSelect={(iso) => {
          setForm((prev) => ({ ...prev, dateOfBirth: iso }));
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* MODAL THÔNG BÁO / CONFIRM */}
      <AppAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmLabel={alertConfig.confirmLabel || 'Đã hiểu'}
        cancelLabel={alertConfig.cancelLabel}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />


    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingWrap: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  backBtnPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.95 }],
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Hero Card
  profileHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0284C7',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  cameraBtnPressed: {
    backgroundColor: '#0369A1',
    transform: [{ scale: 0.95 }],
  },
  deleteAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  deleteAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Name Row with Pencil Icon
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  ptFullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  editNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  editNameBtnPressed: {
    backgroundColor: '#BAE6FD',
    transform: [{ scale: 0.92 }],
  },

  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  ptUsername: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginTop: 16,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  // Information display cards
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  cardHeaderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardHeaderActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  verticalInfoRow: {
    paddingVertical: 8,
    gap: 6,
  },
  infoKey: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  certificatesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  certText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  infoEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  bioText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },

  // Security button bar
  adminBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adminBarSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  securityBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityBarBtnPressed: {
    backgroundColor: '#F8FAFC',
  },
  securityBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  securityBarSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // System Card (Sign out)
  systemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  systemHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    paddingVertical: 13,
    minHeight: 44,
  },
  signOutBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },


  // -------------------------------------------------------------
  // BOTTOM SHEET SỬA HỒ SƠ & BẢO MẬT
  // -------------------------------------------------------------
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sheetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTabBar: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  sheetTabBtnActive: {
    backgroundColor: '#0F172A',
  },
  sheetTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  sheetTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sheetScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sheetSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 70,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  datePickerText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genderPillSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  genderPillTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  sheetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
  },
  sheetSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Password in Sheet
  passwordRuleBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  passwordRuleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  passwordRuleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  passwordRuleDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  eyeBtn: {
    padding: 6,
  },

  // Photo Source Modal
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  photoModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10,
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  photoModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoModalItemPressed: {
    backgroundColor: '#EDF2F7',
  },
  photoModalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  photoModalCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  photoModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
