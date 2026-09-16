import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAlertModal, AlertModalType } from '@/components/AppAlertModal';
import { DatePickerModal } from '@/components/DatePickerModal';
import { MetricChart } from '@/components/progress/ProgressVisuals';
import { api } from '@/services/api/client';
import { API_BASE_URL } from '@/services/config';
import {
  asRecord,
  asRecords,
  formatDate,
  readNumber,
  readText,
} from '@/services/journey';
import {
  ATTENDANCE,
  MEASUREMENTS,
  sessionTitle,
} from '@/services/progress';
import { recordId } from '@/services/workouts';
import { colors } from '@/theme/colors';
import type {
  CustomerJourney,
  CustomerProfile,
} from '@/types/domain';

const MASCOT_COACH = require('../../assets/public/3s-coach.png');
const MASCOT_CHEF = require('../../assets/public/3s-chef.png');

type DetailTabKey =
  | 'overview'
  | 'inbody'
  | 'sessions'
  | 'photos'
  | 'plans'
  | 'nutrition'
  | 'consultations';

interface CustomerDetailModalProps {
  visible: boolean;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    initialGoal?: string;
    measurementCount?: number;
    status: string;
    rawProfile?: CustomerProfile | null;
  } | null;
  onClose: () => void;
  onEdit?: () => void;
  onManagePackages?: () => void;
}

const formatDateDisplay = (isoStr?: string | null): string => {
  if (!isoStr) return 'Chưa cập nhật';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getGenderText = (gender?: string): string => {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'Nữ';
  if (gender === 'OTHER') return 'Khác';
  return 'Chưa cập nhật';
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'ACTIVE':
      return { text: 'Đang hoạt động', color: '#16A34A', bg: '#DCFCE7' };
    case 'INACTIVE':
      return { text: 'Ngừng hoạt động', color: '#64748B', bg: '#F1F5F9' };
    case 'LEAD':
      return { text: 'Tiềm năng', color: '#D97706', bg: '#FEF3C7' };
    default:
      return { text: status || 'Đang hoạt động', color: '#16A34A', bg: '#DCFCE7' };
  }
};

function formatPhotoUrl(path: string): string {
  if (!path) return '';
  const trimmed = path.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://')
  ) {
    return trimmed;
  }
  const cleanBase = (API_BASE_URL || '').replace(/\/$/, '');
  const cleanPath = trimmed.replace(/^\//, '');
  return `${cleanBase}/${cleanPath}`;
}

export function CustomerDetailModal({
  visible,
  customer,
  onClose,
  onEdit,
}: CustomerDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DetailTabKey>('overview');
  const [journey, setJourney] = useState<CustomerJourney | null>(null);
  const [loadedCustomerId, setLoadedCustomerId] = useState<string | null>(null);
  const [metricChoice, setMetricChoice] = useState('weight');

  // Custom photos and consultations state (direct API syncing)
  const [extraPhotos, setExtraPhotos] = useState<any[] | null>(null);
  const [extraConsultations, setExtraConsultations] = useState<any[] | null>(null);

  // Before / After subtab & comparison state
  const [photoSubTab, setPhotoSubTab] = useState<'gallery' | 'compare'>('gallery');
  const [stageFilter, setStageFilter] = useState<string>('');

  // Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Consultation Form State
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showConsultDatePicker, setShowConsultDatePicker] = useState(false);
  const [consultDate, setConsultDate] = useState(new Date().toISOString().slice(0, 10));
  const [consultTopic, setConsultTopic] = useState('');
  const [consultCondition, setConsultCondition] = useState('');
  const [consultAdvice, setConsultAdvice] = useState('');
  const [consultActionPlan, setConsultActionPlan] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [submittingConsult, setSubmittingConsult] = useState(false);
  const [editingConsultId, setEditingConsultId] = useState<string | null>(null);

  const loadingJourney = Boolean(
    visible && customer?.id && loadedCustomerId !== customer.id
  );

  // Load journey and direct endpoints
  const loadData = (targetId: string) => {
    api
      .get<CustomerJourney>(`/api/customers/${encodeURIComponent(targetId)}/journey`)
      .then((data) => {
        setJourney(data);
        setLoadedCustomerId(targetId);
      })
      .catch(() => {
        setJourney(null);
        setLoadedCustomerId(targetId);
      });

    // Fetch photos
    api
      .get<any>(`/api/customers/${encodeURIComponent(targetId)}/photos?page=1&limit=50`)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.photos || res?.data || [];
        setExtraPhotos(list);
      })
      .catch((err) => {
        console.warn('Fetch photos error:', err);
        setExtraPhotos(null);
      });

    // Fetch consultations
    api
      .get<any>(`/api/customers/${encodeURIComponent(targetId)}/consultations?page=1&limit=50`)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setExtraConsultations(list);
      })
      .catch(() => setExtraConsultations(null));
  };

  useEffect(() => {
    if (visible && customer?.id) {
      loadData(customer.id);
    }
  }, [visible, customer?.id]);

  // Derived user info
  const profile = customer?.rawProfile;
  const badge = getStatusBadge(customer?.status || profile?.status);

  const height = profile?.height || readNumber(journey?.customer, ['height']) || 0;
  const weight =
    profile?.initialWeight ||
    readNumber(journey?.customer, ['initialWeight']) ||
    0;
  const heightM = height / 100;
  const bmi = heightM > 0 && weight > 0 ? (weight / (heightM * heightM)).toFixed(1) : null;

  // Extracted data collections
  const sessions = useMemo(() => {
    return asRecords(journey?.sessions).sort((a, b) =>
      readText(b, ['performedAt']).localeCompare(readText(a, ['performedAt']))
    );
  }, [journey?.sessions]);

  const measurements = useMemo(() => {
    return asRecords(journey?.measurements).sort((a, b) =>
      readText(b, ['measuredAt']).localeCompare(readText(a, ['measuredAt']))
    );
  }, [journey?.measurements]);

  const inbodyRecords = useMemo(() => {
    return asRecords(journey?.inbodyRecords);
  }, [journey?.inbodyRecords]);

  // Merge photos from direct endpoint and journey
  const photos = useMemo(() => {
    if (Array.isArray(extraPhotos) && extraPhotos.length > 0) return extraPhotos;
    const jPhotos = asRecords(journey?.photos);
    if (jPhotos.length > 0) return jPhotos;
    return Array.isArray(extraPhotos) ? extraPhotos : [];
  }, [extraPhotos, journey?.photos]);

  const activePlan = useMemo(() => {
    const p = journey?.plans;
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      return asRecord((p as Record<string, unknown>).active);
    }
    return {};
  }, [journey?.plans]);

  const nutritionPlans = useMemo(() => {
    return asRecords(journey?.nutritionPlans);
  }, [journey?.nutritionPlans]);

  // Merge consultations
  const consultations = useMemo(() => {
    if (extraConsultations && extraConsultations.length > 0) return extraConsultations;
    return asRecords((journey as Record<string, unknown> | null)?.consultations);
  }, [extraConsultations, journey]);



  // Alert modal state
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

  const showAlert = (cfg: {
    type?: AlertModalType;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => {
    setAlertConfig({
      visible: true,
      type: cfg.type || 'info',
      title: cfg.title,
      message: cfg.message,
      confirmLabel: cfg.confirmLabel || 'Đã hiểu',
      cancelLabel: cfg.cancelLabel,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        cfg.onConfirm?.();
      },
      onCancel: cfg.onCancel
        ? () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            cfg.onCancel?.();
          }
        : undefined,
    });
  };

  // Upload and save photo directly without form inputs
  const uploadAndSavePhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!customer?.id) return;
    setUploadingPhoto(true);
    try {
      let finalUrl = asset.uri;
      try {
        const fd = new FormData();
        const fileUri = Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', '');
        const filename = asset.fileName || `photo_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        fd.append('image', {
          uri: fileUri,
          name: filename,
          type: mimeType,
        } as any);

        const uploadResult = await api.upload<any>('/api/upload/image', fd);
        if (uploadResult?.url) {
          finalUrl = uploadResult.url;
        } else if (uploadResult?.data?.url) {
          finalUrl = uploadResult.data.url;
        }
      } catch (err) {
        console.warn('Upload image to server failed, using local/base64 fallback:', err);
        if (asset.base64) {
          finalUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        }
      }

      await api.post(`/api/customers/${customer.id}/photos`, [
        {
          photoUrl: finalUrl,
          stage: 'PROGRESS',
          angle: 'FRONT',
          weight: null,
          notes: '',
          takenDate: new Date().toISOString(),
        },
      ]);

      loadData(customer.id);
      showAlert({ type: 'success', title: 'Đã lưu', message: 'Đã lưu ảnh thành công.' });
    } catch (err) {
      showAlert({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể lưu ảnh: ' + (err as Error).message,
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Camera action
  const handleTakePhoto = async () => {
    try {
      const current = await ImagePicker.getCameraPermissionsAsync();
      let granted = current.granted;
      if (!granted) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        granted = perm.granted;
      }
      if (!granted) {
        showAlert({
          type: 'warning',
          title: 'Cần quyền Camera',
          message: 'Cần cấp quyền Camera để chụp ảnh.',
        });
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        await uploadAndSavePhoto(res.assets[0]);
      }
    } catch (e) {
      showAlert({ type: 'error', title: 'Lỗi máy ảnh', message: (e as Error).message });
    }
  };

  // Gallery action
  const handlePickPhoto = async () => {
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      let granted = current.granted;
      if (!granted) {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = perm.granted;
      }
      if (!granted) {
        showAlert({
          type: 'warning',
          title: 'Cần quyền Thư viện',
          message: 'Cần cấp quyền Thư viện để chọn ảnh.',
        });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [3, 4],
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        await uploadAndSavePhoto(res.assets[0]);
      }
    } catch (e) {
      showAlert({ type: 'error', title: 'Lỗi thư viện', message: (e as Error).message });
    }
  };

  // Delete photo
  const handleDeletePhoto = (photoItem: any) => {
    const id = recordId(photoItem);
    if (!id || !customer?.id) return;
    showAlert({
      type: 'warning',
      title: 'Xóa ảnh?',
      message: 'Ảnh sẽ bị xóa khỏi hệ thống.',
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
      onConfirm: async () => {
        try {
          await api.delete(`/api/customers/${customer.id}/photos/${id}`);
          loadData(customer.id);
        } catch (e) {
          showAlert({ type: 'error', title: 'Lỗi', message: (e as Error).message });
        }
      },
    });
  };

  // Open create consultation modal
  const handleOpenCreateConsultation = () => {
    setEditingConsultId(null);
    setConsultDate(new Date().toISOString().slice(0, 10));
    setConsultTopic('');
    setConsultCondition('');
    setConsultAdvice('');
    setConsultActionPlan('');
    setConsultNotes('');
    setShowConsultationModal(true);
  };

  // Open edit consultation modal
  const handleEditConsultation = (c: Record<string, unknown>) => {
    const cId = recordId(c);
    if (!cId) return;
    setEditingConsultId(cId);
    const rawDate = readText(c, ['consultationDate', 'consultedAt', 'createdAt']);
    setConsultDate(rawDate ? rawDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setConsultTopic(readText(c, ['topic']));
    setConsultCondition(readText(c, ['currentCondition']));
    setConsultAdvice(readText(c, ['advice']));
    setConsultActionPlan(readText(c, ['actionPlan']));
    setConsultNotes(readText(c, ['notes']));
    setShowConsultationModal(true);
  };

  // Delete consultation
  const handleDeleteConsultation = (c: Record<string, unknown>) => {
    const cId = recordId(c);
    if (!customer?.id || !cId) return;
    const topic = readText(c, ['topic'], 'buổi tư vấn');
    showAlert({
      type: 'error',
      title: 'Xóa buổi tư vấn',
      message: `Bạn có chắc muốn xóa "${topic}"?`,
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
      onConfirm: async () => {
        try {
          await api.delete(`/api/customers/${customer.id}/consultations/${cId}`);
          loadData(customer.id);
          showAlert({ type: 'success', title: 'Thành công', message: 'Đã xóa buổi tư vấn.' });
        } catch (e) {
          showAlert({ type: 'error', title: 'Lỗi', message: (e as Error).message });
        }
      },
    });
  };

  // Submit consultation (create or update)
  const handleSaveConsultation = async () => {
    if (!customer?.id) return;
    if (!consultTopic.trim()) {
      showAlert({
        type: 'warning',
        title: 'Thiếu chủ đề',
        message: 'Vui lòng nhập chủ đề tư vấn.',
      });
      return;
    }
    setSubmittingConsult(true);
    try {
      const payload = {
        consultationDate: consultDate,
        topic: consultTopic.trim(),
        currentCondition: consultCondition.trim(),
        advice: consultAdvice.trim(),
        actionPlan: consultActionPlan.trim(),
        notes: consultNotes.trim(),
      };
      if (editingConsultId) {
        await api.patch(`/api/customers/${customer.id}/consultations/${editingConsultId}`, payload);
      } else {
        await api.post(`/api/customers/${customer.id}/consultations`, payload);
      }
      setShowConsultationModal(false);
      setEditingConsultId(null);
      setConsultTopic('');
      setConsultCondition('');
      setConsultAdvice('');
      setConsultActionPlan('');
      setConsultNotes('');
      loadData(customer.id);
      showAlert({
        type: 'success',
        title: 'Thành công',
        message: editingConsultId ? 'Đã cập nhật buổi tư vấn.' : 'Đã lưu buổi tư vấn.',
      });
    } catch (e) {
      showAlert({ type: 'error', title: 'Lỗi', message: (e as Error).message });
    } finally {
      setSubmittingConsult(false);
    }
  };

  const latestSession = sessions[0];
  const latestSessionDate = latestSession
    ? formatDate(readText(latestSession, ['performedAt']))
    : '—';

  // Tabs definition
  const tabList: { key: DetailTabKey; label: string; icon: keyof typeof Feather.glyphMap; count?: number }[] = [
    { key: 'overview', label: 'Tổng quan & Hồ sơ', icon: 'user' },
    {
      key: 'inbody',
      label: 'InBody & Số đo',
      icon: 'activity',
      count: measurements.length || inbodyRecords.length,
    },
    { key: 'sessions', label: 'Lịch sử tập luyện', icon: 'calendar', count: sessions.length },
    { key: 'photos', label: 'Ảnh Before / After', icon: 'camera', count: photos.length },
    {
      key: 'plans',
      label: 'Giáo án',
      icon: 'file-text',
      count: Object.keys(activePlan).length ? 1 : 0,
    },
    {
      key: 'nutrition',
      label: 'Thực đơn Dinh dưỡng',
      icon: 'coffee',
      count: nutritionPlans.length,
    },
    {
      key: 'consultations',
      label: 'Lịch sử tư vấn',
      icon: 'message-square',
      count: consultations.length,
    },
  ];

  // Extract timestamp helper
  const getPhotoTime = (photo: Record<string, unknown>): number => {
    const t =
      readText(photo, ['createdAt', 'takenDate', 'takenAt', 'updatedAt']) ||
      readText(photo, ['_id'])?.slice(0, 8);
    if (t) {
      const ms = new Date(t).getTime();
      if (!isNaN(ms)) return ms;
    }
    return 0;
  };

  // Sorted chronologically: oldest first (index 0 is oldest / BEFORE)
  const sortedPhotosChronological = useMemo(() => {
    return [...photos].sort((a, b) => getPhotoTime(a) - getPhotoTime(b));
  }, [photos]);

  // Dynamic stage: oldest is BEFORE, newest is AFTER, in-between is PROGRESS
  const getDynamicStage = useCallback(
    (photo: Record<string, unknown>): 'BEFORE' | 'AFTER' | 'PROGRESS' => {
      if (sortedPhotosChronological.length <= 1) return 'BEFORE';
      const id = recordId(photo);
      const oldestId = recordId(sortedPhotosChronological[0]);
      const newestId = recordId(sortedPhotosChronological[sortedPhotosChronological.length - 1]);
      if (id === oldestId) return 'BEFORE';
      if (id === newestId) return 'AFTER';
      return 'PROGRESS';
    },
    [sortedPhotosChronological]
  );

  const beforePhotoObj = useMemo(() => {
    return sortedPhotosChronological[0] || null;
  }, [sortedPhotosChronological]);

  const afterPhotoObj = useMemo(() => {
    if (sortedPhotosChronological.length > 1) {
      return sortedPhotosChronological[sortedPhotosChronological.length - 1];
    }
    return null;
  }, [sortedPhotosChronological]);

  // Gallery grid shows newest first, filterable by dynamic stage
  const filteredPhotos = useMemo(() => {
    const reversed = [...sortedPhotosChronological].reverse();
    if (!stageFilter) return reversed;
    return reversed.filter((p) => getDynamicStage(p) === stageFilter);
  }, [getDynamicStage, sortedPhotosChronological, stageFilter]);

  if (!customer) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* TOP HEADER */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {customer.fullName.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.fullName} numberOfLines={1} ellipsizeMode="tail">
                {customer.fullName}
              </Text>
              <View style={styles.metaRow}>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
                </View>
                <View style={styles.phoneBox}>
                  <Feather name="phone" size={11} color="#64748B" />
                  <Text style={styles.metaText}>{customer.phone || 'Chưa có SĐT'}</Text>
                </View>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{getGenderText(profile?.gender)}</Text>
              </View>
            </View>
          </View>

          {/* Right Action buttons */}
          <View style={styles.headerActions}>
            {onEdit && (
              <Pressable
                onPress={() => {
                  onClose();
                  onEdit();
                }}
                hitSlop={8}
                style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
                accessibilityLabel="Sửa thông tin khách hàng"
              >
                <Feather name="edit-2" size={13} color="#475569" />
                <Text style={styles.editBtnText}>Sửa</Text>
              </Pressable>
            )}

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              accessibilityLabel="Đóng chi tiết hồ sơ"
            >
              <Feather name="x" size={20} color="#0F172A" />
            </Pressable>
          </View>
        </View>

        {/* HORIZONTAL SCROLLABLE SPORT PILL TABS */}
        <View style={styles.tabBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {tabList.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    styles.tabPill,
                    isActive ? styles.tabPillActive : styles.tabPillInactive,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Feather
                    name={tab.icon}
                    size={14}
                    color={isActive ? '#FFFFFF' : '#475569'}
                  />
                  <Text
                    style={[
                      styles.tabPillText,
                      isActive ? styles.tabPillTextActive : styles.tabPillTextInactive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <View
                      style={[
                        styles.tabCountBadge,
                        isActive
                          ? styles.tabCountBadgeActive
                          : styles.tabCountBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabCountText,
                          isActive
                            ? styles.tabCountTextActive
                            : styles.tabCountTextInactive,
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* MAIN BODY CONTENT */}
        {loadingJourney ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải dữ liệu hồ sơ...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={[
              styles.scrollBody,
              { paddingBottom: Math.max(insets.bottom, 24) + 30 },
            ]}
          >
            {/* 1. TAB: TỔNG QUAN & HỒ SƠ */}
            {activeTab === 'overview' && (
              <View style={styles.sectionWrap}>
                <View style={styles.overviewGrid}>
                  <Pressable
                    style={styles.overviewCard}
                    onPress={() => setActiveTab('inbody')}
                  >
                    <View style={styles.overviewCardTop}>
                      <Text style={styles.overviewCardLabel}>CHIỀU CAO & CÂN NẶNG</Text>
                      <Feather name="chevron-right" size={14} color="#94A3B8" />
                    </View>
                    <Text style={styles.overviewCardValue}>
                      {height ? `${height} cm` : '—'} • {weight ? `${weight} kg` : '—'}
                    </Text>
                    <Text style={styles.overviewCardSub}>
                      {bmi ? `BMI ban đầu: ${bmi}` : 'Chưa đủ dữ liệu BMI'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.overviewCard}
                    onPress={() => setActiveTab('sessions')}
                  >
                    <View style={styles.overviewCardTop}>
                      <Text style={styles.overviewCardLabel}>TỔNG BUỔI ĐÃ TẬP</Text>
                      <Feather name="chevron-right" size={14} color="#94A3B8" />
                    </View>
                    <Text style={styles.overviewCardValue}>{sessions.length} buổi tập</Text>
                    <Text style={styles.overviewCardSub}>
                      Lần gần nhất: {latestSessionDate}
                    </Text>
                  </Pressable>
                </View>

                {/* Thẻ Mục tiêu tập luyện */}
                <View style={styles.contentCard}>
                  <View style={styles.cardHeaderRow}>
                    <Feather name="target" size={16} color="#0284C7" />
                    <Text style={styles.cardTitle}>Mục tiêu tập luyện</Text>
                  </View>
                  <Text style={styles.cardBodyText}>
                    {customer.initialGoal ||
                      profile?.initialGoal ||
                      'Chưa cập nhật mục tiêu cụ thể.'}
                  </Text>
                </View>

                {/* Thẻ Lưu ý sức khỏe & Bệnh lý */}
                <View
                  style={[
                    styles.contentCard,
                    profile?.medicalNotes
                      ? styles.alertCardWarning
                      : styles.alertCardNeutral,
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <Feather
                      name="alert-circle"
                      size={16}
                      color={profile?.medicalNotes ? '#DC2626' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: profile?.medicalNotes ? '#B91C1C' : '#334155' },
                      ]}
                    >
                      Lưu ý sức khỏe & Bệnh lý
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.cardBodyText,
                      { color: profile?.medicalNotes ? '#991B1B' : '#475569' },
                    ]}
                  >
                    {profile?.medicalNotes ||
                      'Không có tiền sử bệnh lý hoặc chấn thương đặc biệt.'}
                  </Text>
                </View>

                {/* Thẻ Ghi chú nội bộ của PT */}
                <View style={[styles.contentCard, styles.noteCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Feather name="file-text" size={16} color="#B45309" />
                    <Text style={[styles.cardTitle, { color: '#92400E' }]}>
                      Ghi chú nội bộ của PT
                    </Text>
                  </View>
                  <Text style={[styles.cardBodyText, { color: '#78350F' }]}>
                    {profile?.internalNotes || 'Chưa có ghi chú nội bộ.'}
                  </Text>
                </View>

                {/* Thẻ Thông tin liên hệ & Hồ sơ cá nhân */}
                <View style={styles.contentCard}>
                  <View style={styles.cardHeaderRow}>
                    <Feather name="info" size={16} color="#0284C7" />
                    <Text style={styles.cardTitle}>Thông tin cá nhân & Liên hệ</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Số điện thoại:</Text>
                    <Text style={styles.infoVal}>{customer.phone || 'Chưa cập nhật'}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Email:</Text>
                    <Text style={styles.infoVal}>
                      {customer.email || profile?.email || 'Chưa cập nhật'}
                    </Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Ngày sinh:</Text>
                    <Text style={styles.infoVal}>
                      {formatDateDisplay(profile?.dateOfBirth)}
                    </Text>
                  </View>
                  <View style={[styles.infoLine, { borderBottomWidth: 0 }]}>
                    <Text style={styles.infoKey}>Giới tính:</Text>
                    <Text style={styles.infoVal}>{getGenderText(profile?.gender)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 2. TAB: INBODY & SỐ ĐO */}
            {activeTab === 'inbody' && (
              <View style={styles.sectionWrap}>
                {measurements.length > 0 ? (
                  <>
                    <View style={styles.metricPickerRow}>
                      {[
                        ['weight', 'Cân nặng (kg)'],
                        ['bodyFatPercentage', 'Tỷ lệ mỡ (%)'],
                        ['muscleMass', 'Khối lượng cơ (kg)'],
                      ].map(([mKey, mLabel]) => (
                        <Pressable
                          key={mKey}
                          onPress={() => setMetricChoice(mKey)}
                          style={[
                            styles.metricFilterPill,
                            metricChoice === mKey && styles.metricFilterPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.metricFilterText,
                              metricChoice === mKey && styles.metricFilterTextActive,
                            ]}
                          >
                            {mLabel}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.chartCard}>
                      <MetricChart
                        records={measurements}
                        metric={metricChoice}
                        unit={
                          MEASUREMENTS.find(([key]) => key === metricChoice)?.[2] || ''
                        }
                      />
                    </View>

                    <Text style={styles.listSectionTitle}>
                      LỊCH SỬ CÁC LẦN ĐO ({measurements.length})
                    </Text>
                    {measurements.map((m, idx) => {
                      const weightVal = readNumber(m, ['weight']);
                      const fatVal = readNumber(m, ['bodyFatPercentage']);
                      const muscleVal = readNumber(m, ['muscleMass']);
                      const isSynced = inbodyRecords.some(
                        (rec) => recordId(rec) === recordId(m)
                      );

                      return (
                        <View key={recordId(m) || idx} style={styles.measurementItemCard}>
                          <View style={styles.measurementItemHeader}>
                            <View style={styles.measDateRow}>
                              <Feather name="calendar" size={13} color="#0284C7" />
                              <Text style={styles.measDateText}>
                                {formatDate(readText(m, ['measuredAt']))}
                              </Text>
                            </View>
                            {isSynced && (
                              <View style={styles.inbodyBadge}>
                                <Text style={styles.inbodyBadgeText}>InBody</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.measStatsGrid}>
                            <View style={styles.measStatCol}>
                              <Text style={styles.measStatLabel}>Cân nặng</Text>
                              <Text style={styles.measStatVal}>
                                {weightVal !== null ? `${weightVal} kg` : '—'}
                              </Text>
                            </View>
                            <View style={styles.measStatCol}>
                              <Text style={styles.measStatLabel}>Tỷ lệ mỡ</Text>
                              <Text style={styles.measStatVal}>
                                {fatVal !== null ? `${fatVal}%` : '—'}
                              </Text>
                            </View>
                            <View style={styles.measStatCol}>
                              <Text style={styles.measStatLabel}>Khối lượng cơ</Text>
                              <Text style={styles.measStatVal}>
                                {muscleVal !== null ? `${muscleVal} kg` : '—'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <View style={styles.emptyCard}>
                    <Image
                      source={MASCOT_COACH}
                      style={styles.emptyMascotImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyTitle}>Chưa có số đo</Text>
                    <Text style={styles.emptyDesc}>Chỉ số sẽ hiển thị sau khi đo InBody.</Text>
                  </View>
                )}
              </View>
            )}

            {/* 3. TAB: LỊCH SỬ TẬP LUYỆN */}
            {activeTab === 'sessions' && (
              <View style={styles.sectionWrap}>
                {sessions.length > 0 ? (
                  <>
                    <View style={styles.sessionOverviewBanner}>
                      <Feather name="check-circle" size={16} color="#0284C7" />
                      <Text style={styles.sessionOverviewText}>
                        Đã thực hiện tổng cộng {sessions.length} buổi tập cùng PT.
                      </Text>
                    </View>

                    {sessions.map((s, idx) => {
                      const att = readText(s, ['attendance']);
                      const attText =
                        ATTENDANCE[att as keyof typeof ATTENDANCE] || 'Đã ghi nhận';
                      const title = sessionTitle(s);
                      const performedAt = formatDate(readText(s, ['performedAt']), true);
                      const exerciseLogs = asRecords(s.exerciseLogs);

                      return (
                        <View key={recordId(s) || idx} style={styles.sessionCard}>
                          <View style={styles.sessionHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.sessionTitleText}>{title}</Text>
                              <Text style={styles.sessionDateText}>{performedAt}</Text>
                            </View>
                            <View
                              style={[
                                styles.attendanceBadge,
                                att === 'ABSENT'
                                  ? styles.attAbsent
                                  : att === 'LATE'
                                  ? styles.attLate
                                  : styles.attPresent,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.attendanceText,
                                  att === 'ABSENT'
                                    ? styles.attTextAbsent
                                    : att === 'LATE'
                                    ? styles.attTextLate
                                    : styles.attTextPresent,
                                ]}
                              >
                                {attText}
                              </Text>
                            </View>
                          </View>

                          {exerciseLogs.length > 0 && (
                            <View style={styles.sessionExercisesBox}>
                              <Text style={styles.sessionExCount}>
                                {exerciseLogs.length} bài tập đã ghi nhận:
                              </Text>
                              {exerciseLogs.slice(0, 3).map((log, lIdx) => (
                                <Text
                                  key={lIdx}
                                  style={styles.sessionExItem}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  • {readText(log, ['name'], `Bài ${lIdx + 1}`)}
                                </Text>
                              ))}
                              {exerciseLogs.length > 3 && (
                                <Text style={styles.sessionExMore}>
                                  và {exerciseLogs.length - 3} bài tập khác...
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <View style={styles.emptyCard}>
                    <Image
                      source={MASCOT_COACH}
                      style={styles.emptyMascotImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyTitle}>Chưa có buổi tập</Text>
                    <Text style={styles.emptyDesc}>Lịch sử tập với PT sẽ hiển thị tại đây.</Text>
                  </View>
                )}
              </View>
            )}

            {/* 4. TAB: ẢNH BEFORE / AFTER */}
            {activeTab === 'photos' && (
              <View style={styles.sectionWrap}>
                {/* SUB-TAB TOGGLE: Segmented Control trung tính (White on Gray) */}
                <View style={styles.segmentedControl}>
                  <Pressable
                    style={[
                      styles.segmentBtn,
                      photoSubTab === 'gallery' && styles.segmentBtnActive,
                    ]}
                    onPress={() => setPhotoSubTab('gallery')}
                  >
                    <Feather
                      name="image"
                      size={13}
                      color={photoSubTab === 'gallery' ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        photoSubTab === 'gallery' && styles.segmentTextActive,
                      ]}
                    >
                      Thư viện ({photos.length})
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.segmentBtn,
                      photoSubTab === 'compare' && styles.segmentBtnActive,
                    ]}
                    onPress={() => setPhotoSubTab('compare')}
                  >
                    <Feather
                      name="sliders"
                      size={13}
                      color={photoSubTab === 'compare' ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        photoSubTab === 'compare' && styles.segmentTextActive,
                      ]}
                    >
                      So sánh Before / After
                    </Text>
                  </Pressable>
                </View>

                {/* THANH THAO TÁC (CHỈ HIỆN KHI ĐÃ CÓ ẢNH ĐỂ TRÁNH LẶP NÚT VỚI TRẠNG THÁI TRỐNG) */}
                {photos.length > 0 && photoSubTab === 'gallery' && (
                  <View style={styles.photosToolBar}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.stageFilterScroll}
                    >
                      {[
                        ['', 'Tất cả'],
                        ['BEFORE', 'Before'],
                        ['AFTER', 'After'],
                        ['PROGRESS', 'Tiến độ'],
                      ].map(([stVal, stLabel]) => (
                        <Pressable
                          key={stVal}
                          onPress={() => setStageFilter(stVal)}
                          style={[
                            styles.stageFilterPill,
                            stageFilter === stVal && styles.stageFilterPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stageFilterText,
                              stageFilter === stVal && styles.stageFilterTextActive,
                            ]}
                          >
                            {stLabel}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <View style={styles.photoQuickActions}>
                      <Pressable
                        style={styles.quickDarkBtn}
                        onPress={handleTakePhoto}
                        disabled={uploadingPhoto}
                        hitSlop={6}
                        accessibilityLabel="Chụp ảnh Camera"
                      >
                        {uploadingPhoto ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Feather name="camera" size={15} color="#FFFFFF" />
                        )}
                      </Pressable>
                      <Pressable
                        style={styles.quickLightBtn}
                        onPress={handlePickPhoto}
                        disabled={uploadingPhoto}
                        hitSlop={6}
                        accessibilityLabel="Tải ảnh từ thư viện"
                      >
                        <Feather name="plus" size={15} color="#0F172A" />
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* 4A. SUB-VIEW: THƯ VIỆN ẢNH */}
                {photoSubTab === 'gallery' && (
                  <>
                    {filteredPhotos.length > 0 ? (
                      <View style={styles.photosGrid}>
                        {filteredPhotos.map((photo, idx) => {
                          const uri = formatPhotoUrl(readText(photo, ['photoUrl']));
                          const dateStr = formatDate(
                            readText(photo, ['takenDate', 'takenAt', 'createdAt'])
                          );
                          const stage = getDynamicStage(photo);
                          const stageLabel =
                            stage === 'BEFORE'
                              ? 'Before'
                              : stage === 'AFTER'
                              ? 'After'
                              : 'Tiến độ';
                          const weightP = readNumber(photo, ['weight']);

                          return (
                            <View key={recordId(photo) || idx} style={styles.photoItemCard}>
                              {uri ? (
                                <Image
                                  source={{ uri }}
                                  style={styles.photoImg}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.photoPlaceholder}>
                                  <Feather name="image" size={24} color="#CBD5E1" />
                                </View>
                              )}

                              {/* Stage badge on top left */}
                              <View
                                style={[
                                  styles.photoStageBadge,
                                  stage === 'BEFORE'
                                    ? styles.stageBefore
                                    : stage === 'AFTER'
                                    ? styles.stageAfter
                                    : styles.stageProgress,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.photoStageText,
                                    stage === 'BEFORE'
                                      ? styles.stageTextBefore
                                      : stage === 'AFTER'
                                      ? styles.stageTextAfter
                                      : styles.stageTextProgress,
                                  ]}
                                >
                                  {stageLabel}
                                </Text>
                              </View>

                              {/* Delete button on top right */}
                              <Pressable
                                style={styles.photoDeleteBtn}
                                onPress={() => handleDeletePhoto(photo)}
                                hitSlop={8}
                              >
                                <Feather name="trash-2" size={13} color="#EF4444" />
                              </Pressable>

                              <View style={styles.photoMeta}>
                                <Text style={styles.photoDateText}>{dateStr}</Text>
                                {weightP !== null && (
                                  <Text style={styles.photoWeightText}>{weightP} kg</Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.emptyCard}>
                        <Image
                          source={MASCOT_COACH}
                          style={styles.emptyMascotImg}
                          resizeMode="contain"
                        />
                        <Text style={styles.emptyTitle}>Chưa có ảnh</Text>
                        <Text style={styles.emptyDesc}>Chụp hoặc tải ảnh để theo dõi tiến độ.</Text>
                        <View style={styles.emptyActionRow}>
                          <Pressable
                            style={styles.emptyDarkBtn}
                            onPress={handleTakePhoto}
                            disabled={uploadingPhoto}
                            accessibilityLabel="Chụp ảnh Camera"
                          >
                            {uploadingPhoto ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Feather name="camera" size={15} color="#FFFFFF" />
                                <Text style={styles.emptyDarkBtnText}>Chụp ảnh Camera</Text>
                              </>
                            )}
                          </Pressable>
                          <Pressable
                            style={styles.emptyLightBtn}
                            onPress={handlePickPhoto}
                            disabled={uploadingPhoto}
                            accessibilityLabel="Tải ảnh từ thư viện"
                          >
                            <Feather name="upload" size={15} color="#0F172A" />
                            <Text style={styles.emptyLightBtnText}>Chọn từ thư viện</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* 4B. SUB-VIEW: SO SÁNH BEFORE / AFTER */}
                {photoSubTab === 'compare' && (
                  <View style={styles.compareContainer}>
                    {photos.length < 2 ? (
                      <View style={styles.emptyCard}>
                        <Image
                          source={MASCOT_COACH}
                          style={styles.emptyMascotImg}
                          resizeMode="contain"
                        />
                        <Text style={styles.emptyTitle}>Cần ít nhất 2 ảnh</Text>
                        <Text style={styles.emptyDesc}>Thêm ảnh Before và After để so sánh.</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.compareNotice}>
                          <Feather name="info" size={14} color="#0284C7" />
                          <Text style={styles.compareNoticeText}>
                            So sánh vóc dáng trước và sau tập
                          </Text>
                        </View>

                        {/* 2 CỘT SO SÁNH CẠNH NHAU */}
                        <View style={styles.compareGrid}>
                          {/* CỘT BEFORE */}
                          <View style={styles.compareCol}>
                            <View style={[styles.compareColHeader, { backgroundColor: '#E0F2FE' }]}>
                              <Text style={[styles.compareColTitle, { color: '#0369A1' }]}>
                                BEFORE (CŨ NHẤT)
                              </Text>
                            </View>
                            {beforePhotoObj ? (
                              <View style={styles.compareImgWrap}>
                                <Image
                                  source={{
                                    uri: formatPhotoUrl(readText(beforePhotoObj, ['photoUrl'])),
                                  }}
                                  style={styles.compareImg}
                                  resizeMode="cover"
                                />
                                <View style={styles.compareMetaBox}>
                                  <Text style={styles.compareDate}>
                                    {formatDate(readText(beforePhotoObj, ['takenDate']))}
                                  </Text>
                                  {readNumber(beforePhotoObj, ['weight']) && (
                                    <Text style={styles.compareWeight}>
                                      {readNumber(beforePhotoObj, ['weight'])} kg
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ) : (
                              <View style={styles.compareEmptyBox}>
                                <Text style={styles.compareEmptyText}>Chọn ảnh Before</Text>
                              </View>
                            )}
                          </View>

                          {/* CỘT AFTER */}
                          <View style={styles.compareCol}>
                            <View style={[styles.compareColHeader, { backgroundColor: '#DCFCE7' }]}>
                              <Text style={[styles.compareColTitle, { color: '#15803D' }]}>
                                AFTER (MỚI NHẤT)
                              </Text>
                            </View>
                            {afterPhotoObj ? (
                              <View style={styles.compareImgWrap}>
                                <Image
                                  source={{
                                    uri: formatPhotoUrl(readText(afterPhotoObj, ['photoUrl'])),
                                  }}
                                  style={styles.compareImg}
                                  resizeMode="cover"
                                />
                                <View style={styles.compareMetaBox}>
                                  <Text style={styles.compareDate}>
                                    {formatDate(readText(afterPhotoObj, ['takenDate']))}
                                  </Text>
                                  {readNumber(afterPhotoObj, ['weight']) && (
                                    <Text style={styles.compareWeight}>
                                      {readNumber(afterPhotoObj, ['weight'])} kg
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ) : (
                              <View style={styles.compareEmptyBox}>
                                <Text style={styles.compareEmptyText}>Chọn ảnh After</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* 5. TAB: GIÁO ÁN */}
            {activeTab === 'plans' && (
              <View style={styles.sectionWrap}>
                {Object.keys(activePlan).length > 0 ? (
                  <View style={styles.contentCard}>
                    <View style={styles.cardHeaderRow}>
                      <Feather name="file-text" size={18} color="#0284C7" />
                      <Text style={styles.cardTitle}>
                        {readText(activePlan, ['title'], 'Giáo án đang áp dụng')}
                      </Text>
                    </View>
                    <Text style={styles.cardBodyText}>
                      {readText(
                        activePlan,
                        ['description'],
                        'Giáo án huấn luyện cá nhân hóa theo mục tiêu thể lực của học viên.'
                      )}
                    </Text>
                    <Pressable
                      style={styles.primaryActionBtn}
                      onPress={() => {
                        onClose();
                        router.push('/(app)/plans');
                      }}
                    >
                      <Feather name="external-link" size={15} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Xem chi tiết giáo án</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Image
                      source={MASCOT_COACH}
                      style={styles.emptyMascotImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyTitle}>Chưa có giáo án</Text>
                    <Text style={styles.emptyDesc}>Gán giáo án mẫu để bắt đầu lộ trình.</Text>
                    <Pressable
                      style={styles.primaryActionBtn}
                      onPress={() => {
                        onClose();
                        router.push('/(app)/plans');
                      }}
                    >
                      <Feather name="plus" size={15} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Gán giáo án</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* 6. TAB: THỰC ĐƠN DINH DƯỠNG */}
            {activeTab === 'nutrition' && (
              <View style={styles.sectionWrap}>
                {nutritionPlans.length > 0 ? (
                  nutritionPlans.map((plan, idx) => (
                    <View key={readText(plan, ['id', 'uuid'], String(idx))} style={styles.contentCard}>
                      <View style={styles.cardHeaderRow}>
                        <Feather name="coffee" size={18} color="#0284C7" />
                        <Text style={styles.cardTitle}>
                          {readText(plan, ['name', 'title'], `Thực đơn ${idx + 1}`)}
                        </Text>
                      </View>
                      <Text style={styles.cardBodyText}>
                        {readText(
                          plan,
                          ['description'],
                          'Kế hoạch dinh dưỡng theo mục tiêu tăng cơ / giảm mỡ.'
                        )}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Image
                      source={MASCOT_CHEF}
                      style={styles.emptyMascotImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyTitle}>Chưa có thực đơn</Text>
                    <Text style={styles.emptyDesc}>Thực đơn dinh dưỡng sẽ hiển thị tại đây.</Text>
                    <Pressable
                      style={styles.primaryActionBtn}
                      onPress={() => {
                        onClose();
                        router.push('/(app)/(tabs)/nutrition');
                      }}
                    >
                      <Feather name="plus" size={15} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Thiết kế thực đơn ngay</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* 7. TAB: LỊCH SỬ TƯ VẤN */}
            {activeTab === 'consultations' && (
              <View style={styles.sectionWrap}>
                <View style={styles.tabSectionHeader}>
                  <Text style={styles.tabSectionTitle}>
                    LỊCH SỬ TƯ VẤN ({consultations.length})
                  </Text>
                  <Pressable
                    style={styles.createConsultBtn}
                    onPress={handleOpenCreateConsultation}
                  >
                    <Feather name="plus" size={14} color="#FFFFFF" />
                    <Text style={styles.createConsultBtnText}>Thêm buổi tư vấn</Text>
                  </Pressable>
                </View>

                {consultations.length > 0 ? (
                  consultations.map((c, idx) => (
                    <View key={recordId(c) || idx} style={styles.contentCard}>
                      <View style={styles.cardHeaderRow}>
                        <Feather name="message-square" size={16} color="#0284C7" />
                        <Text style={styles.cardTitle}>
                          {readText(c, ['topic'], 'Buổi tư vấn')}
                        </Text>
                        <Text style={styles.consultDateBadge}>
                          {formatDate(readText(c, ['consultationDate', 'consultedAt', 'createdAt']))}
                        </Text>
                        <View style={styles.consultHeaderActions}>
                          <Pressable
                            style={styles.consultActionBtn}
                            onPress={() => handleEditConsultation(c)}
                            hitSlop={8}
                            accessibilityLabel="Sửa buổi tư vấn"
                          >
                            <Feather name="edit-2" size={14} color="#475569" />
                          </Pressable>
                          <Pressable
                            style={styles.consultActionBtnDanger}
                            onPress={() => handleDeleteConsultation(c)}
                            hitSlop={8}
                            accessibilityLabel="Xóa buổi tư vấn"
                          >
                            <Feather name="trash-2" size={14} color="#EF4444" />
                          </Pressable>
                        </View>
                      </View>

                      {readText(c, ['currentCondition']) ? (
                        <View style={styles.consultFieldBlock}>
                          <Text style={styles.consultFieldLabel}>Thể trạng / Hiện tại:</Text>
                          <Text style={styles.cardBodyText}>
                            {readText(c, ['currentCondition'])}
                          </Text>
                        </View>
                      ) : null}

                      {readText(c, ['advice']) ? (
                        <View style={styles.consultFieldBlock}>
                          <Text style={styles.consultFieldLabel}>Lời khuyên của PT:</Text>
                          <Text style={styles.cardBodyText}>{readText(c, ['advice'])}</Text>
                        </View>
                      ) : null}

                      {readText(c, ['actionPlan']) ? (
                        <View style={styles.consultFieldBlock}>
                          <Text style={styles.consultFieldLabel}>Kế hoạch hành động:</Text>
                          <Text style={styles.cardBodyText}>
                            {readText(c, ['actionPlan'])}
                          </Text>
                        </View>
                      ) : null}

                      {readText(c, ['notes']) ? (
                        <View style={[styles.consultFieldBlock, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#F1F5F9', paddingTop: 6 }]}>
                          <Text style={styles.consultFieldLabel}>Ghi chú nội bộ PT:</Text>
                          <Text style={[styles.cardBodyText, { color: '#854D0E' }]}>
                            {readText(c, ['notes'])}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Image
                      source={MASCOT_COACH}
                      style={styles.emptyMascotImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyTitle}>Chưa có tư vấn</Text>
                    <Text style={styles.emptyDesc}>Ghi lại lịch sử tư vấn tại đây.</Text>
                    <Pressable
                      style={styles.primaryActionBtn}
                      onPress={handleOpenCreateConsultation}
                    >
                      <Feather name="plus" size={15} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Thêm buổi tư vấn</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* MODAL / SHEET: THÊM BUỔI TƯ VẤN MỚI */}
        <Modal
          visible={showConsultationModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowConsultationModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
            <View style={[styles.modalSheetCard, { maxHeight: '90%' }]}>
              <View style={styles.modalSheetHeader}>
                <Text style={styles.modalSheetTitle}>
                  {editingConsultId ? 'Sửa buổi tư vấn' : 'Thêm buổi tư vấn mới'}
                </Text>
                <Pressable
                  onPress={() => {
                    setShowConsultationModal(false);
                    setEditingConsultId(null);
                  }}
                  hitSlop={10}
                  style={styles.closeBtn}
                >
                  <Feather name="x" size={18} color="#0F172A" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ padding: 16, gap: 12 }}
              >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 140 }}>
                    <Text style={styles.inputLabel}>Ngày tư vấn:</Text>
                    <Pressable
                      style={styles.datePickerInputBtn}
                      onPress={() => setShowConsultDatePicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Chọn ngày tư vấn"
                    >
                      <Feather name="calendar" size={14} color="#0284C7" />
                      <Text style={styles.datePickerInputText}>
                        {formatDateDisplay(consultDate) || consultDate}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Chủ đề tư vấn:</Text>
                    <TextInput
                      style={styles.textInput}
                      value={consultTopic}
                      onChangeText={setConsultTopic}
                      placeholder="VD: Tư vấn dinh dưỡng..."
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Tình trạng hiện tại / Thể trạng:</Text>
                  <TextInput
                    style={[styles.textInput, { height: 68 }]}
                    value={consultCondition}
                    onChangeText={setConsultCondition}
                    placeholder="Ghi nhận thể trạng, mức năng lượng, thói quen ăn uống hoặc đau mỏi..."
                    multiline
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Lời khuyên & Chỉ định của PT:</Text>
                  <TextInput
                    style={[styles.textInput, { height: 68 }]}
                    value={consultAdvice}
                    onChangeText={setConsultAdvice}
                    placeholder="Lời khuyên về khẩu phần dinh dưỡng, lưu ý tập luyện, chế độ nghỉ ngơi..."
                    multiline
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Kế hoạch hành động (Action Plan):</Text>
                  <TextInput
                    style={[styles.textInput, { height: 68 }]}
                    value={consultActionPlan}
                    onChangeText={setConsultActionPlan}
                    placeholder="Các mục tiêu và hành động cần học viên hoàn thành trong tuần tới..."
                    multiline
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Ghi chú nội bộ PT:</Text>
                  <TextInput
                    style={[styles.textInput, { height: 60 }]}
                    value={consultNotes}
                    onChangeText={setConsultNotes}
                    placeholder="Ghi chú riêng của PT (bệnh lý phát sinh, tâm lý học viên...)"
                    multiline
                  />
                </View>

                {/* Nút bấm */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => {
                      setShowConsultationModal(false);
                      setEditingConsultId(null);
                    }}
                    disabled={submittingConsult}
                  >
                    <Text style={styles.modalCancelBtnText}>Hủy</Text>
                  </Pressable>

                  <Pressable
                    style={styles.modalSubmitBtn}
                    onPress={handleSaveConsultation}
                    disabled={submittingConsult}
                  >
                    {submittingConsult ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={16} color="#FFFFFF" />
                        <Text style={styles.modalSubmitBtnText}>
                          {editingConsultId ? 'Lưu thay đổi' : 'Tạo buổi tư vấn'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* DATE PICKER MODAL CHO BUỔI TƯ VẤN */}
        <DatePickerModal
          visible={showConsultDatePicker}
          value={consultDate}
          title="Chọn ngày tư vấn"
          onClose={() => setShowConsultDatePicker(false)}
          onSelect={(isoDate) => {
            setConsultDate(isoDate);
            setShowConsultDatePicker(false);
          }}
        />

        {/* CUSTOM ALERT MODAL BO GÓC 24PX */}
        <AppAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          confirmLabel={alertConfig.confirmLabel}
          cancelLabel={alertConfig.cancelLabel}
          onConfirm={alertConfig.onConfirm}
          onCancel={alertConfig.onCancel}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  btnPressed: {
    opacity: 0.7,
  },

  /* TOP HEADER */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  accountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  accountBadgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* TAB BAR */
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    minHeight: 34,
  },
  tabPillActive: {
    backgroundColor: '#0284C7',
  },
  tabPillInactive: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabPillTextInactive: {
    color: '#475569',
  },
  tabCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountBadgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  tabCountTextInactive: {
    color: '#475569',
  },

  /* BODY */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollBody: {
    padding: 16,
  },
  sectionWrap: {
    gap: 12,
  },

  /* OVERVIEW GRID */
  overviewGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  overviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  overviewCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  overviewCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  overviewCardSub: {
    fontSize: 11,
    color: '#64748B',
  },

  /* CONTENT CARDS */
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
  },

  /* ALERT CARDS */
  alertCardNeutral: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  alertCardWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  noteCard: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
  },

  /* INFO TABLE */
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  infoKey: {
    fontSize: 13,
    color: '#64748B',
    width: 100,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
  },

  /* INBODY TAB */
  metricPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricFilterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricFilterPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  metricFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  metricFilterTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  measurementItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  measurementItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  measDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  measDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  inbodyBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inbodyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  measStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  measStatCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  measStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  measStatVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* SESSIONS TAB */
  sessionOverviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  sessionOverviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
    flex: 1,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sessionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  sessionDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  attendanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attPresent: {
    backgroundColor: '#DCFCE7',
  },
  attLate: {
    backgroundColor: '#FEF3C7',
  },
  attAbsent: {
    backgroundColor: '#FEE2E2',
  },
  attendanceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  attTextPresent: {
    color: '#16A34A',
  },
  attTextLate: {
    color: '#D97706',
  },
  attTextAbsent: {
    color: '#DC2626',
  },
  sessionExercisesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  sessionExCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  sessionExItem: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  sessionExMore: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#94A3B8',
    marginTop: 2,
  },

  /* PHOTOS TAB */
  segmentedControl: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    minHeight: 38,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  photosToolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  photoQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickDarkBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLightBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  emptyDarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  emptyDarkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyLightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  emptyLightBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  stageFilterScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  stageFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageFilterPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  stageFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  stageFilterTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },

  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItemCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: 160,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStageBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stageBefore: {
    backgroundColor: '#E0F2FE',
  },
  stageAfter: {
    backgroundColor: '#DCFCE7',
  },
  stageProgress: {
    backgroundColor: '#F3E8FF',
  },
  photoStageText: {
    fontSize: 9,
    fontWeight: '800',
  },
  stageTextBefore: {
    color: '#0369A1',
  },
  stageTextAfter: {
    color: '#15803D',
  },
  stageTextProgress: {
    color: '#7C3AED',
  },

  photoDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoMeta: {
    paddingHorizontal: 8,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoAngleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoAngleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  photoDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  photoWeightRow: {
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  photoWeightText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },

  /* COMPARE MODE */
  compareContainer: {
    gap: 12,
  },
  compareNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 14,
  },
  compareNoticeText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '500',
  },
  compareGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  compareCol: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compareColHeader: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  compareColTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compareImgWrap: {
    width: '100%',
  },
  compareImg: {
    width: '100%',
    height: 220,
  },
  compareMetaBox: {
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  compareDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  compareWeight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  compareEmptyBox: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  compareEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  /* CONSULTATIONS TAB */
  tabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tabSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  createConsultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createConsultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  consultDateBadge: {
    marginLeft: 'auto',
    marginRight: 8,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  consultHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  consultActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultActionBtnDanger: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultFieldBlock: {
    marginTop: 6,
  },
  consultFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },

  /* EMPTY STATES */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginVertical: 8,
  },
  emptyMascotImg: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 14,
  },

  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
    minHeight: 44,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* MODAL SHEETS (POPUP) */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewBox: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  optionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  optionPillTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0284C7',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  datePickerInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: '#F8FAFC',
  },
  datePickerInputText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
});
