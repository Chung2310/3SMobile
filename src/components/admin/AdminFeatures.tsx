import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api/client';
import {
  featureNames,
  featurePayload,
  type FeatureConfiguration,
} from '@/services/adminOperations';
import { recordId } from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { RecordPicker } from './RecordPicker';

function FeatureEditorSheet({
  initial,
  onClose,
  onSaved,
}: {
  initial: FeatureConfiguration;
  onClose: () => void;
  onSaved: (updated?: FeatureConfiguration) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<FeatureConfiguration>(() => ({
    ...initial,
    roles: [...initial.roles],
    pilotUserIds: [...initial.pilotUserIds],
  }));
  const [pilots, setPilots] = useState(() => initial.pilotUserIds.map((id) => ({ _id: id })));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);

  const dirty = JSON.stringify(featurePayload(draft)) !== JSON.stringify(featurePayload(initial));

  const handleClose = () => {
    if (!lock.current) {
      if (dirty) setDiscard(true);
      else onClose();
    }
  };

  const handleSave = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const latest = (await api.get<FeatureConfiguration[]>('/api/features')).find(
        (f) => f.key === initial.key
      );
      if (!latest || JSON.stringify(featurePayload(latest)) !== JSON.stringify(featurePayload(initial))) {
        throw new Error('Cấu hình đã thay đổi. Hãy đóng và tải lại trước khi chỉnh sửa.');
      }
      await api.patch(`/api/features/${encodeURIComponent(initial.key)}`, featurePayload(draft));
      onSaved(draft);
      onClose();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const roleOptions = [
    { id: 'ADMIN', label: 'Quản trị viên (ADMIN)' },
    { id: 'PT', label: 'Huấn luyện viên (PT)' },
    { id: 'CUSTOMER', label: 'Hội viên (CUSTOMER)' },
  ];

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>
                {featureNames[initial.key] || initial.key}
              </Text>
              <Text style={styles.sheetKeySub}>Mã tính năng: {initial.key}</Text>
            </View>

            <Pressable onPress={handleClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetBody}
          >
            {error ? (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorNoticeText}>{error}</Text>
              </View>
            ) : null}

            {/* Toggle Active Status */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Trạng thái kích hoạt</Text>
              <Pressable
                onPress={() => setDraft((d) => ({ ...d, enabled: !d.enabled }))}
                style={[
                  styles.toggleBtn,
                  draft.enabled ? styles.toggleBtnActive : styles.toggleBtnInactive,
                ]}
              >
                <Ionicons
                  name={draft.enabled ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={draft.enabled ? '#16A34A' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: draft.enabled ? '#16A34A' : '#EF4444' },
                  ]}
                >
                  {draft.enabled ? 'Đang kích hoạt (Bật)' : 'Đang tạm tắt'}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.toggleHintText}>Chạm để đổi</Text>
              </Pressable>
            </View>

            {/* Roles Permissions */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Vai trò được phép sử dụng</Text>
              <Text style={styles.settingHint}>
                Khi tính năng bị tắt, cả tài khoản thử nghiệm cũng không được dùng. Super Admin kế thừa quyền ADMIN khi tính năng được bật.
              </Text>
              <View style={styles.rolesList}>
                {roleOptions.map((role) => {
                  const checked = draft.roles.includes(role.id);
                  return (
                    <Pressable
                      key={role.id}
                      disabled={busy}
                      onPress={() =>
                        setDraft((d) => ({
                          ...d,
                          roles: checked
                            ? d.roles.filter((r) => r !== role.id)
                            : [...d.roles, role.id],
                        }))
                      }
                      style={[
                        styles.roleSelectRow,
                        checked && styles.roleSelectRowChecked,
                      ]}
                    >
                      <Feather
                        name={checked ? 'check-square' : 'square'}
                        size={20}
                        color={checked ? colors.primary : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.roleSelectLabel,
                          checked && styles.roleSelectLabelChecked,
                        ]}
                      >
                        {role.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Pilot Users Picker */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Tài khoản thử nghiệm nội bộ</Text>
              <Text style={styles.settingHint}>
                Các tài khoản được chỉ định trải nghiệm sớm trước khi phát hành diện rộng.
              </Text>
              <RecordPicker
                label="Chọn tài khoản thử nghiệm"
                source="/api/users"
                disabled={busy}
                selected={pilots}
                onChange={(newItems) => {
                  setPilots(newItems.map((item) => ({ ...item, _id: recordId(item) })));
                  setDraft((d) => ({ ...d, pilotUserIds: newItems.map(recordId) }));
                }}
              />
            </View>
          </ScrollView>

          {/* Footer Save */}
          <View style={styles.sheetFooter}>
            <Pressable
              onPress={handleClose}
              disabled={busy}
              style={styles.sheetCancelBtn}
            >
              <Text style={styles.sheetCancelText}>Đóng</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSave()}
              disabled={busy || !dirty}
              style={[
                styles.sheetSaveBtn,
                (!dirty || busy) && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sheetSaveText}>Lưu cấu hình</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Discard changes alert modal */}
        {discard && (
          <Modal visible={discard} transparent animationType="fade">
            <View style={styles.discardOverlay}>
              <View style={styles.discardCard}>
                <Ionicons name="warning-outline" size={36} color="#D97706" style={{ marginBottom: 8 }} />
                <Text style={styles.discardTitle}>Bỏ các thay đổi?</Text>
                <Text style={styles.discardDesc}>
                  Bạn có các cấu hình tính năng chưa lưu. Các thay đổi này sẽ bị hủy bỏ nếu bạn đóng bây giờ.
                </Text>

                <View style={styles.discardActions}>
                  <Pressable
                    onPress={() => setDiscard(false)}
                    style={styles.discardKeepBtn}
                  >
                    <Text style={styles.discardKeepText}>Tiếp tục sửa</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setDiscard(false);
                      onClose();
                    }}
                    style={styles.discardConfirmBtn}
                  >
                    <Text style={styles.discardConfirmText}>Bỏ thay đổi</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

export function AdminFeatures() {
  const [flags, setFlags] = useState<FeatureConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<FeatureConfiguration>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get<FeatureConfiguration[]>('/api/features');
        if (active) {
          setFlags(data || []);

        }
      } catch (cause) {
        if (active) {
          setFlags([]);
          setError((cause as { status?: number }).status === 404
            ? 'Máy chủ chưa hỗ trợ đọc cấu hình tính năng. Vui lòng cập nhật máy chủ rồi thử lại.'
            : messageOf(cause));
        }      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reload]);

  const onRefresh = () => {
    setRefreshing(true);
    setReload((n) => n + 1);
  };

  const totalCount = flags.length;
  const enabledCount = flags.filter((f) => f.enabled).length;
  const disabledCount = totalCount - enabledCount;

  return (
    <View style={styles.container}>
      {/* 1. STATS OVERVIEW CARD */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="toggle" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{loading || error ? '—' : totalCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng tính năng
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{loading || error ? '—' : enabledCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Đang bật
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="pause-circle" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{loading || error ? '—' : disabledCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Đang tắt
            </Text>
          </View>
        </View>
      </View>

      {/* 2. TOOLBAR */}
      <View style={styles.toolbarRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolbarTitle}>Quản lý phân quyền tính năng</Text>
          <Text style={styles.toolbarSub}>
            Bật/tắt tính năng theo thời gian thực và quản lý tài khoản thử nghiệm
          </Text>
        </View>

        <Pressable
          onPress={() => setReload((n) => n + 1)}
          disabled={loading}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* Saved Banner */}
      {saved && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.successText}>Đã lưu và áp dụng cấu hình tính năng mới.</Text>
        </View>
      )}

      {/* 3. FEATURES LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải danh sách tính năng…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => setReload((n) => n + 1)} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : flags.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="toggle-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có cấu hình tính năng nào.</Text>
          </View>
        ) : (
          flags.map((flag) => {
            const isEnabled = flag.enabled;
            const friendlyName = featureNames[flag.key] || flag.key;

            return (
              <View key={flag.key} style={styles.featureCard}>
                <Pressable
                  onPress={() => setSelected(flag)}
                  style={({ pressed }) => [
                    styles.cardMainPressable,
                    pressed && { opacity: 0.92 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Cấu hình tính năng ${friendlyName}`}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.featureIconBox}>
                      <Ionicons
                        name="options"
                        size={20}
                        color={isEnabled ? colors.primary : '#94A3B8'}
                      />
                    </View>

                    <View style={styles.headerInfo}>
                      <Text style={styles.featureTitle} numberOfLines={2} ellipsizeMode="tail">
                        {friendlyName}
                      </Text>
                      <Text style={styles.featureKeyText}>key: {flag.key}</Text>
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

                  {/* Permissions Chips */}
                  <View style={styles.chipsRow}>
                    <View style={styles.rolesChipContainer}>
                      <Feather name="shield" size={11} color="#64748B" />
                      <Text style={styles.chipLabel}>
                        {flag.roles.length > 0
                          ? `Vai trò: ${flag.roles.join(', ')}`
                          : 'Chưa cấp vai trò'}
                      </Text>
                    </View>

                    {flag.pilotUserIds.length > 0 && (
                      <View style={styles.pilotsChipContainer}>
                        <Feather name="users" size={11} color={colors.primary} />
                        <Text style={styles.pilotsChipText}>
                          {flag.pilotUserIds.length} tài khoản thử nghiệm
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {/* Card Action */}
                <View style={styles.cardActionsRow}>
                  <Pressable
                    onPress={() => setSelected(flag)}
                    style={({ pressed }) => [
                      styles.configBtn,
                      pressed && styles.configBtnPressed,
                    ]}
                  >
                    <Feather name="settings" size={14} color={colors.primary} />
                    <Text style={styles.configBtnText}>Cấu hình quyền tính năng</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL: FEATURE CONFIGURATION SHEET */}
      {selected && (
        <FeatureEditorSheet
          key={selected.key}
          initial={selected}
          onClose={() => setSelected(undefined)}
          onSaved={(updated) => {
            if (updated) {
              setFlags((current) =>
                current.map((f) => (f.key === updated.key ? updated : f))
              );
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3500);
            setReload((n) => n + 1);
          }}
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
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
    gap: 12,
    marginBottom: 10,
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  toolbarSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
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
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    lineHeight: 16,
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
  featureCard: {
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
    gap: 10,
  },
  cardMainPressable: {
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  featureKeyText: {
    fontSize: 11,
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
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  rolesChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  chipLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  pilotsChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  pilotsChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  cardActionsRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  configBtn: {
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
  configBtnPressed: {
    opacity: 0.75,
    backgroundColor: '#E0F2FE',
  },
  configBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  // Sheet
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
    maxHeight: '92%',
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
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sheetKeySub: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sheetBody: {
    paddingVertical: 14,
    gap: 16,
  },
  settingGroup: {
    gap: 6,
  },
  settingLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  settingHint: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  toggleBtnInactive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleHintText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  rolesList: {
    gap: 8,
    marginTop: 4,
  },
  roleSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  roleSelectRowChecked: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  roleSelectLabel: {
    fontSize: 13.5,
    color: '#475569',
  },
  roleSelectLabelChecked: {
    color: colors.primary,
    fontWeight: '700',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sheetCancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  sheetSaveBtn: {
    flex: 2,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  // Discard Modal
  discardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  discardCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  discardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  discardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  discardActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  discardKeepBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardKeepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  discardConfirmBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
