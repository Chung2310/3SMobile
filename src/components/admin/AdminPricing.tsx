import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api/client';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

export interface Policy {
  taskType: string;
  enabled: boolean;
  maxReservationCredits: number;
  fallbackCredits: number;
  markupBasisPoints: number;
  minBillableCredits: number;
}

export interface Pricing {
  vndPerCredit: number;
  usdToVnd: number;
  policies: Policy[];
}

export const taskTypeFriendlyNames: Record<string, string> = {
  WORKOUT_GENERATION: 'Tạo giáo án luyện tập AI',
  INBODY_OCR: 'Quét phiếu chỉ số InBody',
  MEAL_PLAN: 'Gợi ý thực đơn dinh dưỡng',
  FOOD_IMAGE_GENERATION: 'Tạo ảnh món ăn bằng AI',
  PT_ASSISTANT: 'Hỏi đáp trợ lý huấn luyện viên',
  PROGRESS_ANALYSIS: 'Phân tích tiến độ thể hình',
  KNOWLEDGE_SEARCH: 'Truy vấn tri thức thể thao',
  EXERCISE_SUGGESTION: 'Gợi ý biến thể bài tập',
};

// Send only schema fields; server documents also contain Mongo metadata.
export function pricingPayload(data: Pricing): Pricing {
  return {
    vndPerCredit: data.vndPerCredit,
    usdToVnd: data.usdToVnd,
    policies: data.policies.map((p) => ({
      taskType: p.taskType,
      enabled: p.enabled,
      maxReservationCredits: p.maxReservationCredits,
      fallbackCredits: p.fallbackCredits,
      markupBasisPoints: p.markupBasisPoints,
      minBillableCredits: p.minBillableCredits,
    })),
  };
}

// Modal chỉnh sửa tỷ giá quy đổi
function RatesEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: { vndPerCredit: number; usdToVnd: number };
  onClose: () => void;
  onSave: (vndPerCredit: number, usdToVnd: number) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [vndPerCredit, setVndPerCredit] = useState(String(initial.vndPerCredit));
  const [usdToVnd, setUsdToVnd] = useState(String(initial.usdToVnd));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const vpc = Number(vndPerCredit);
    if (!Number.isFinite(vpc) || vpc < 1 || !Number.isInteger(vpc)) {
      setError('VNĐ cho mỗi credit phải là số nguyên lớn hơn hoặc bằng 1.');
      return;
    }
    const utv = Number(usdToVnd);
    if (!Number.isFinite(utv) || utv < 1 || !Number.isInteger(utv)) {
      setError('Tỷ giá VNĐ / USD phải là số nguyên lớn hơn hoặc bằng 1.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSave(vpc, utv);
      onClose();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Cập nhật tỷ giá quy đổi</Text>
              <Text style={styles.sheetSub}>
                Áp dụng tức thì cho việc định giá các tác vụ AI mới
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                VNĐ cho mỗi Credit (1 Credit = ? VNĐ) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={vndPerCredit}
                onChangeText={(t) => setVndPerCredit(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="1000"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>
                Hiện tại: 1 Credit = {Number(vndPerCredit || 0).toLocaleString('vi-VN')} VNĐ
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Tỷ giá VNĐ cho mỗi USD (1 USD = ? VNĐ) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={usdToVnd}
                onChangeText={(t) => setUsdToVnd(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="25000"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>
                Hiện tại: 1 USD = {Number(usdToVnd || 0).toLocaleString('vi-VN')} VNĐ
              </Text>
            </View>
          </ScrollView>

          <View style={styles.formFooter}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSave()}
              disabled={busy}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save" size={17} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu tỷ giá</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Modal chỉnh sửa chính sách tác vụ AI
function PolicyEditorModal({
  policy,
  onClose,
  onSave,
}: {
  policy: Policy;
  onClose: () => void;
  onSave: (updated: Policy) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(policy.enabled);
  const [maxRes, setMaxRes] = useState(String(policy.maxReservationCredits));
  const [fallback, setFallback] = useState(String(policy.fallbackCredits));
  const [minBill, setMinBill] = useState(String(policy.minBillableCredits));
  const [markupBp, setMarkupBp] = useState(String(policy.markupBasisPoints));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const friendlyName = taskTypeFriendlyNames[policy.taskType] || policy.taskType;

  const handleSave = async () => {
    const maxVal = Number(maxRes);
    if (!Number.isFinite(maxVal) || maxVal < 1 || !Number.isInteger(maxVal)) {
      setError('Credit giữ chỗ tối đa phải là số nguyên từ 1 trở lên.');
      return;
    }
    const fallVal = Number(fallback);
    if (!Number.isFinite(fallVal) || fallVal < 0 || !Number.isInteger(fallVal)) {
      setError('Credit dự phòng phải là số nguyên không âm.');
      return;
    }
    if (fallVal > maxVal) {
      setError('Credit dự phòng không được vượt quá credit giữ chỗ tối đa.');
      return;
    }
    const minVal = Number(minBill);
    if (!Number.isFinite(minVal) || minVal < 0 || !Number.isInteger(minVal)) {
      setError('Credit tính phí tối thiểu phải là số nguyên không âm.');
      return;
    }
    const markupVal = Number(markupBp);
    if (!Number.isFinite(markupVal) || markupVal < 0 || !Number.isInteger(markupVal)) {
      setError('Phụ phí điểm cơ bản phải là số nguyên không âm (100 = 1%).');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSave({
        taskType: policy.taskType,
        enabled,
        maxReservationCredits: maxVal,
        fallbackCredits: fallVal,
        minBillableCredits: minVal,
        markupBasisPoints: markupVal,
      });
      onClose();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {friendlyName}
              </Text>
              <Text style={styles.sheetSub}>taskType: {policy.taskType}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Trạng thái tính phí */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Trạng thái tính phí</Text>
              <Pressable
                onPress={() => setEnabled((prev) => !prev)}
                style={[
                  styles.toggleBtn,
                  enabled ? styles.toggleBtnActive : styles.toggleBtnInactive,
                ]}
              >
                <Ionicons
                  name={enabled ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={enabled ? '#16A34A' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: enabled ? '#16A34A' : '#EF4444' },
                  ]}
                >
                  {enabled ? 'Đang bật tính phí' : 'Đang tạm tắt tính phí'}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.toggleHintText}>Chạm để đổi</Text>
              </Pressable>
            </View>

            {/* Max Reservation Credits */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Credit giữ chỗ tối đa (Max Reservation) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={maxRes}
                onChangeText={(t) => setMaxRes(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>Số credit tạm khóa khi bắt đầu tác vụ AI.</Text>
            </View>

            {/* Fallback Credits */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Credit dự phòng (Fallback Credits) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={fallback}
                onChangeText={(t) => setFallback(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>
                Áp dụng khi hệ thống không ước tính được chi phí token chính xác.
              </Text>
            </View>

            {/* Min Billable Credits */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Credit tính phí tối thiểu (Min Billable) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={minBill}
                onChangeText={(t) => setMinBill(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Markup Basis Points */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phụ phí biên lợi nhuận (Điểm cơ bản, 100 = 1%) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={markupBp}
                onChangeText={(t) => setMarkupBp(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>
                Tương đương: {(Number(markupBp || 0) / 100).toFixed(2)}% phụ phí dịch vụ AI.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.formFooter}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSave()}
              disabled={busy}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save" size={17} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu chính sách</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminPricing() {
  const [data, setData] = useState<Pricing>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editingRates, setEditingRates] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Pricing>('/api/admin/credit-pricing');
      setData(res);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) void load();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleSaveRates = async (vndPerCredit: number, usdToVnd: number) => {
    const latest = await api.get<Pricing>('/api/admin/credit-pricing');
    const updated: Pricing = {
      ...latest,
      vndPerCredit,
      usdToVnd,
    };
    const saved = await api.patch<Pricing>('/api/admin/credit-pricing', pricingPayload(updated));
    setData(saved);
    setSuccess('Đã cập nhật tỷ giá quy đổi tiền tệ.');
    setTimeout(() => setSuccess(''), 3500);
  };

  const handleSavePolicy = async (policy: Policy) => {
    const latest = await api.get<Pricing>('/api/admin/credit-pricing');
    const updated: Pricing = {
      ...latest,
      policies: latest.policies.map((p) => (p.taskType === policy.taskType ? policy : p)),
    };
    const saved = await api.patch<Pricing>('/api/admin/credit-pricing', pricingPayload(updated));
    setData(saved);
    setSuccess(`Đã cập nhật chính sách tác vụ "${taskTypeFriendlyNames[policy.taskType] || policy.taskType}".`);
    setTimeout(() => setSuccess(''), 3500);
  };

  const enabledPoliciesCount = data?.policies.filter((p) => p.enabled).length ?? 0;

  return (
    <View style={styles.container}>
      {/* 1. EXECUTIVE STATS CARD */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Pressable style={styles.statItem} onPress={() => setEditingRates(true)}>
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="cash" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {data ? data.vndPerCredit.toLocaleString('vi-VN') : '—'}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              VNĐ / Credit
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable style={styles.statItem} onPress={() => setEditingRates(true)}>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="trending-up" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>
              {data ? data.usdToVnd.toLocaleString('vi-VN') : '—'}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              VNĐ / USD
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="sparkles" size={16} color="#7C3AED" />
            </View>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>
              {enabledPoliciesCount}/{data?.policies.length ?? 0}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tác vụ AI bật
            </Text>
          </View>
        </View>
      </View>

      {/* 2. ACTION TOOLBAR */}
      <View style={styles.toolbarRow}>
        <Pressable
          onPress={() => setEditingRates(true)}
          style={({ pressed }) => [
            styles.updateRatesBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="sliders" size={16} color="#FFFFFF" />
          <Text style={styles.updateRatesBtnText}>Chỉnh sửa tỷ giá</Text>
        </Pressable>

        <Pressable
          onPress={() => void load()}
          disabled={loading}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* Success Notification Banner */}
      {success ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      {/* 3. POLICIES LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusBoxText}>Đang tải bảng giá và chính sách AI…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : !data?.policies.length ? (
          <View style={styles.statusBox}>
            <Ionicons name="sparkles-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có cấu hình chính sách tác vụ AI nào.</Text>
          </View>
        ) : (
          data.policies.map((policy) => {
            const friendlyName = taskTypeFriendlyNames[policy.taskType] || policy.taskType;
            const isEnabled = policy.enabled;

            return (
              <View key={policy.taskType} style={styles.policyCard}>
                {/* Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.policyIconBox}>
                    <Ionicons
                      name="hardware-chip"
                      size={20}
                      color={isEnabled ? colors.primary : '#94A3B8'}
                    />
                  </View>

                  <View style={styles.headerInfo}>
                    <Text style={styles.policyName} numberOfLines={1} ellipsizeMode="tail">
                      {friendlyName}
                    </Text>
                    <Text style={styles.policyKeyText}>task: {policy.taskType}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isEnabled ? '#DCFCE7' : '#F1F5F9' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isEnabled ? '#16A34A' : '#94A3B8' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: isEnabled ? '#16A34A' : '#64748B' },
                      ]}
                    >
                      {isEnabled ? 'Đang bật' : 'Đang tắt'}
                    </Text>
                  </View>
                </View>

                {/* 4 Metric Chips */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Giữ chỗ tối đa</Text>
                    <Text style={styles.metricValue}>{policy.maxReservationCredits} Credit</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Dự phòng</Text>
                    <Text style={styles.metricValue}>{policy.fallbackCredits} Credit</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Tối thiểu</Text>
                    <Text style={styles.metricValue}>{policy.minBillableCredits} Credit</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Phụ phí biên</Text>
                    <Text style={styles.metricValue}>
                      {(policy.markupBasisPoints / 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {/* Edit Button */}
                <View style={styles.cardActionsRow}>
                  <Pressable
                    onPress={() => setEditingPolicy(policy)}
                    style={({ pressed }) => [
                      styles.configPolicyBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather name="edit-2" size={14} color={colors.primary} />
                    <Text style={styles.configPolicyBtnText}>Chỉnh sửa chính sách</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal: Edit Exchange Rates */}
      {editingRates && data && (
        <RatesEditorModal
          initial={{
            vndPerCredit: data.vndPerCredit,
            usdToVnd: data.usdToVnd,
          }}
          onClose={() => setEditingRates(false)}
          onSave={handleSaveRates}
        />
      )}

      {/* Modal: Edit Task Policy */}
      {editingPolicy && (
        <PolicyEditorModal
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSave={handleSavePolicy}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  updateRatesBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  updateRatesBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  successText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  statusBoxText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statusBoxError: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  policyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  policyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  policyKeyText: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  cardActionsRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  configPolicyBtn: {
    height: 40,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  configPolicyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  // Sheets
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sheetSub: {
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
  formScroll: {
    paddingVertical: 14,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  inputHint: {
    fontSize: 11.5,
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: colors.text,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  toggleBtnInactive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  toggleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  toggleHintText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#EF4444',
    fontWeight: '500',
  },
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    flex: 1.4,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
