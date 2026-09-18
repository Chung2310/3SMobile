import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button, Busy, Field, Notice, Sheet } from '@/components/workouts/Controls';
import { SessionDraftForm, SessionDraftCard } from '@/components/progress/SessionDraftForm';
import { ProgressForm } from '@/components/progress/ProgressForm';
import { MetricChart, SessionCalendar } from '@/components/progress/ProgressVisuals';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';
import { AutomaticReport } from '@/components/progress/AutomaticReport';
import { ProgressNotice } from '@/components/progress/ProgressNotice';
import { TrackingSummary, JourneyPlans, DailyRecords, PhotoGallery } from '@/components/progress/ProgressPanels';
import { asRecord, asRecords, formatDate, readNumber, readText } from '@/services/journey';
import { recordId } from '@/services/workouts';
import { ACHIEVEMENTS, ATTENDANCE, dayKey, journeyPath, MEASUREMENTS, RESULT_FIELDS, sessionTitle } from '@/services/progress';
import { colors } from '@/theme';
import type { JsonRecord } from '@/types/domain';

export const SECTIONS: Record<string, string> = {
  overview: 'Tổng quan',
  measurements: 'Số đo InBody',
  sessions: 'Lịch sử tập',
  photos: 'Ảnh tiến độ',
  reports: 'Báo cáo',
  plans: 'Giáo án',
  daily: 'Theo ngày',
  tracking: 'Thống kê bài tập',
  achievements: 'Thành tích',
};

export const TAB_ITEMS: { key: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'overview', label: 'Tổng quan', icon: 'activity' },
  { key: 'measurements', label: 'Số đo InBody', icon: 'bar-chart-2' },
  { key: 'sessions', label: 'Lịch sử tập', icon: 'calendar' },
  { key: 'photos', label: 'Ảnh tiến độ', icon: 'image' },
  { key: 'reports', label: 'Báo cáo', icon: 'file-text' },
  { key: 'plans', label: 'Giáo án', icon: 'book-open' },
  { key: 'tracking', label: 'Bài tập', icon: 'trending-up' },
  { key: 'achievements', label: 'Thành tích', icon: 'award' },
  { key: 'daily', label: 'Theo ngày', icon: 'clock' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'HV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

const label = (value: unknown) => (value === null || value === undefined ? 'Chưa có' : String(value));

export default function ProgressWorkspaceScreen() {
  const { session } = useAuth();
  const role = session?.user.role;
  const staff = role === 'PT' || role === 'ADMIN' || role === 'SUPER_ADMIN';

  return (
    <Screen
      title="Tiến độ tập luyện"
      subtitle="Theo dõi chỉ số InBody và hành trình"
      onBack={() => router.navigate('/(app)/(tabs)')}
    >
      {session && (staff || role === 'CUSTOMER') ? (
        <ProgressWorkspace key={session.user.id} staff={staff} userId={session.user.id} />
      ) : (
        <Notice error text="Tài khoản không có quyền xem tiến độ." />
      )}
    </Screen>
  );
}

export function ProgressWorkspace({ staff, userId }: { staff: boolean; userId: string }) {
  const [customers, setCustomers] = useState<JsonRecord[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [journey, setJourney] = useState<JsonRecord | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [section, setSection] = useState('overview');
  const [range, setRange] = useState({ from: '', to: '' });
  const [rangeDraft, setRangeDraft] = useState<typeof range | null>(null);
  const [rangeError, setRangeError] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [metric, setMetric] = useState('weight');
  const [form, setForm] = useState<{ kind: 'session' | 'measurement' | 'report'; record?: JsonRecord } | null>(null);
  const [draftRefresh, setDraftRefresh] = useState(0);
  function closeForm() { setForm(null); setDraftRefresh((value) => value + 1); }
  const [detail, setDetail] = useState<JsonRecord | null>(null);
  const [action, setAction] = useState<{ title: string; text: string; path: string; method: 'patch' | 'delete' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const generation = useRef(0);
  const actionLock = useRef(false);
  const [automaticReport, setAutomaticReport] = useState(false);
  const [popup, setPopup] = useState({ message: '', error: false });

  const load = useCallback(async () => {
    const request = ++generation.current;
    setBusy(true);
    setError('');
    try {
      if (staff && !customerId) {
        const list = await api.get<JsonRecord[]>('/api/customers/progress-overview');
        if (request === generation.current) {
          setCustomers(asRecords(list));
          setJourney(null);
        }
      } else {
        const data = await api.get<JsonRecord>(journeyPath(staff ? customerId : undefined, range.from, range.to));
        if (request === generation.current) setJourney(data);
      }
    } catch (e) {
      if (request === generation.current) {
        setError((e as Error).message);
        setJourney(null);
      }
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }, [staff, customerId, range]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load])
  );

  function resetView() {
    generation.current++;
    setJourney(null);
    setError('');
    setSuccess('');
    setSelectedDay('');
    setForm(null);
    setDetail(null);
  }

  function saved() {
    closeForm();
    setSuccess('Đã lưu dữ liệu tiến độ thành công.');
    setPopup({ message: 'Đã lưu dữ liệu tiến độ thành công.', error: false });
    void load();
  }

  async function performAction() {
    if (!action || actionLock.current) return;
    actionLock.current = true;
    setSaving(true);
    setActionError('');
    try {
      await api[action.method](action.path);
      setAction(null);
      setSuccess('Đã cập nhật dữ liệu.');
      setPopup({ message: 'Đã cập nhật dữ liệu.', error: false });
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      actionLock.current = false;
      setSaving(false);
    }
  }

  const customer = asRecord(journey?.customer);
  const customerName = readText(customer, ['fullName'], 'Hồ sơ tiến độ');
  const customerPhone = readText(customer, ['phone'], '');
  const initials = getInitials(customerName);
  const targetId = staff ? customerId : recordId(customer);
  const sessions = asRecords(journey?.sessions).sort((a, b) =>
    readText(b, ['performedAt']).localeCompare(readText(a, ['performedAt']))
  );
  const measurements = asRecords(journey?.measurements).sort((a, b) =>
    readText(b, ['measuredAt']).localeCompare(readText(a, ['measuredAt']))
  );
  const inbodyRecords = asRecords(journey?.inbodyRecords).sort((a, b) =>
    readText(b, ['measuredAt']).localeCompare(readText(a, ['measuredAt']))
  );
  const allMeasurements = [...measurements, ...inbodyRecords].sort((a, b) =>
    readText(b, ['measuredAt']).localeCompare(readText(a, ['measuredAt']))
  );
  const latestMeasure = allMeasurements[0] || null;
  const analytics = asRecord(journey?.analytics);
  const attendance = asRecord(analytics.attendance);
  const candidatePlan = asRecord(asRecord(journey?.plans).active);
  const activePlan = staff || candidatePlan.status === 'PUBLISHED' ? candidatePlan : {};
  const canLog = staff && activePlan.lifecycleStatus === 'ACTIVE' && readText(activePlan, ['ptId']) === userId && asRecords(activePlan.sessions).length > 0;
  const inbodyIds = new Set(inbodyRecords.map(recordId));
  const empty = <Notice text="Chưa có dữ liệu trong khoảng thời gian này." />;

  // Metrics for mobile overview
  const latestWeight = readNumber(latestMeasure, ['weight', 'weightKg']) ?? readNumber(asRecord(latestMeasure?.measurements), ['weight']) ?? readNumber(analytics, ['latestWeight']);
  const latestBodyFat = readNumber(latestMeasure, ['bodyFatPercentage', 'bodyFat', 'bodyFatPercent']) ?? readNumber(asRecord(latestMeasure?.measurements), ['bodyFatPercentage']);
  const latestMuscle = readNumber(latestMeasure, ['muscleMass', 'muscleMassKg']) ?? readNumber(asRecord(latestMeasure?.measurements), ['muscleMass']);
  const rawHeight = readNumber(latestMeasure, ['height']) ?? readNumber(customer, ['height']);
  const heightM = rawHeight ? rawHeight / 100 : null;
  const bmi = (latestWeight && heightM && heightM > 0) ? (latestWeight / (heightM * heightM)).toFixed(1) : null;

  const totalSessions = readNumber(analytics, ['totalSessions']) ?? sessions.length;
  const presentCount = readNumber(attendance, ['present']) ?? 0;
  const lateCount = readNumber(attendance, ['late']) ?? 0;
  const absentCount = readNumber(attendance, ['absent']) ?? 0;
  const streakWeeks = readNumber(analytics, ['streakWeeks']) ?? 0;
  const averageRpe = readNumber(analytics, ['averageRpe']);
  const attendedCount = presentCount + lateCount + absentCount;
  const presentPct = attendedCount > 0 ? (presentCount / attendedCount) * 100 : 0;
  const latePct = attendedCount > 0 ? (lateCount / attendedCount) * 100 : 0;
  const absentPct = attendedCount > 0 ? (absentCount / attendedCount) * 100 : 0;

  const reports = asRecords(journey?.reports).filter((r) => staff || r.status === 'PUBLISHED');

  return (
    <View style={styles.workspaceContainer}>
      {/* Staff Dashboard (when no specific student is picked) */}
      {staff && !customerId && !busy && !error && (
        <ProgressDashboard
          items={customers}
          onSelect={(id, log) => {
            resetView();
            setSection(log ? 'sessions' : 'overview');
            setCustomerId(id);
          }}
        />
      )}

      {error ? <Notice error text={error} /> : null}
      {success ? <Notice tone="success" text={success} /> : null}

      {busy ? (
        <Busy />
      ) : !journey ? (
        !error && (
          staff && !customers.length ? (
            <Notice text="Chưa có học viên nào được phân công cho bạn." />
          ) : !staff ? (
            <Notice text="Vui lòng chọn học viên để xem và ghi nhận tiến độ." />
          ) : null
        )
      ) : (
        <>
          {/* Top Navigation Bar when viewing customer */}
          <View style={styles.topNavRow}>
            {staff && customerId ? (
              <Pressable
                style={styles.backNavBtn}
                onPress={() => {
                  resetView();
                  setCustomerId('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Quay lại danh sách học viên"
              >
                <Feather name="arrow-left" size={18} color={colors.text} />
                <Text style={styles.backNavText}>Danh sách học viên</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <View style={styles.topNavRight}>
              <Pressable
                style={[styles.navActionBtn, Boolean(range.from || range.to) && styles.navActionBtnActive]}
                onPress={() => {
                  setRangeError('');
                  setRangeDraft(range);
                }}
                accessibilityRole="button"
                accessibilityLabel="Bộ lọc ngày"
              >
                <Feather
                  name="calendar"
                  size={16}
                  color={range.from || range.to ? colors.primary : colors.text}
                />
                {Boolean(range.from || range.to) && <View style={styles.activeDot} />}
              </Pressable>

              <Pressable
                style={styles.navActionBtn}
                onPress={() => void load()}
                accessibilityRole="button"
                accessibilityLabel="Tải lại dữ liệu"
              >
                <Feather name="refresh-cw" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Hero Customer Profile Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroProfileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.heroIdentity}>
                <View style={styles.heroTagRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>HỌC VIÊN 3S</Text>
                  </View>
                  {Boolean(range.from || range.to) && (
                    <View style={styles.heroDateTag}>
                      <Feather name="filter" size={11} color={colors.primary} />
                      <Text numberOfLines={1} style={styles.heroDateTagText}>
                        {range.from ? formatDate(range.from) : 'Đầu'} — {range.to ? formatDate(range.to) : 'Nay'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.heroCustomerName}>
                  {customerName}
                </Text>
                {customerPhone ? (
                  <View style={styles.heroPhoneRow}>
                    <Feather name="phone" size={12} color={colors.textMuted} />
                    <Text style={styles.heroPhoneText}>{customerPhone}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* 3-Column Athletic Stat Highlights */}
            <View style={styles.statsCountersRow}>
              <View style={styles.statCounterItem}>
                <Text style={styles.statCounterValue}>{label(totalSessions)}</Text>
                <Text style={styles.statCounterLabel}>BUỔI TẬP</Text>
              </View>
              <View style={styles.statCounterDivider} />
              <View style={styles.statCounterItem}>
                <Text style={styles.statCounterValue}>
                  {attendance.rate !== undefined && attendance.rate !== null ? `${attendance.rate}%` : '—'}
                </Text>
                <Text style={styles.statCounterLabel}>THAM GIA</Text>
              </View>
              <View style={styles.statCounterDivider} />
              <View style={styles.statCounterItem}>
                <Text style={styles.statCounterValue}>
                  {latestWeight !== null ? `${latestWeight} kg` : '—'}
                </Text>
                <Text style={styles.statCounterLabel}>CÂN NẶNG</Text>
              </View>
            </View>

            {/* Fast Action Buttons for PT */}
            {staff && (
              <View style={styles.quickActionRow}>
                {canLog && (
                  <View style={{ flex: 1 }}>
                    <Button
                      icon="plus"
                      label="Ghi buổi tập"
                      onPress={() => setForm({ kind: 'session' })}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Button
                    secondary
                    icon="activity"
                    label="Nhập số đo"
                    onPress={() => setForm({ kind: 'measurement' })}
                  />
                </View>
              </View>
            )}
          </View>

          {staff && targetId && <SessionDraftCard key={targetId} customerId={targetId} refreshKey={draftRefresh} onResume={() => setForm({ kind: 'session' })} />}
          {/* Horizontal Scrollable Athletic Tab Bar */}
          <View style={styles.tabScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollContent}
            >
              {TAB_ITEMS.map((tab) => {
                const isActive = section === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                    onPress={() => setSection(tab.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Feather
                      name={tab.icon}
                      size={15}
                      color={isActive ? '#FFFFFF' : colors.textMuted}
                    />
                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* SECTION: OVERVIEW */}
          {section === 'overview' && (
            <View style={styles.sectionContainer}>
              {/* Recent InBody Snapshot (4-grid) */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sectionHeading}>CHỈ SỐ INBODY GẦN NHẤT</Text>
                  {latestMeasure ? (
                    <Text style={styles.cardHeaderSub}>
                      {formatDate(readText(latestMeasure, ['measuredAt']))}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.metricGrid4}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricBoxLabel}>Cân nặng</Text>
                    <Text style={styles.metricBoxValue}>
                      {latestWeight !== null ? `${latestWeight}` : '—'}{' '}
                      <Text style={styles.metricBoxUnit}>kg</Text>
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricBoxLabel}>Tỷ lệ mỡ</Text>
                    <Text style={[styles.metricBoxValue, { color: colors.warning }]}>
                      {latestBodyFat !== null ? `${latestBodyFat}` : '—'}{' '}
                      <Text style={styles.metricBoxUnit}>%</Text>
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricBoxLabel}>Cơ bắp</Text>
                    <Text style={[styles.metricBoxValue, { color: colors.success }]}>
                      {latestMuscle !== null ? `${latestMuscle}` : '—'}{' '}
                      <Text style={styles.metricBoxUnit}>kg</Text>
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricBoxLabel}>Chỉ số BMI</Text>
                    <Text style={[styles.metricBoxValue, { color: colors.primary }]}>
                      {bmi !== null ? bmi : (averageRpe !== undefined ? `RPE ${averageRpe}` : '—')}
                    </Text>
                  </View>
                </View>

                <Button
                  secondary
                  label="Xem toàn bộ số đo"
                  onPress={() => setSection('measurements')}
                />
              </View>

              {/* Attendance & Consistency Card */}
              <View style={styles.card}>
                <Text style={styles.sectionHeading}>ĐIỂM DANH & CHUỖI TẬP</Text>

                {/* Visual Progress Bar */}
                <View style={styles.attendanceBarWrapper}>
                  <View style={styles.attendanceBar}>
                    {presentPct > 0 && (
                      <View style={[styles.attendanceSegment, { flex: presentPct, backgroundColor: colors.success }]} />
                    )}
                    {latePct > 0 && (
                      <View style={[styles.attendanceSegment, { flex: latePct, backgroundColor: colors.warning }]} />
                    )}
                    {absentPct > 0 && (
                      <View style={[styles.attendanceSegment, { flex: absentPct, backgroundColor: colors.danger }]} />
                    )}
                    {attendedCount === 0 && (
                      <View style={[styles.attendanceSegment, { flex: 1, backgroundColor: colors.borderSoft }]} />
                    )}
                  </View>
                </View>

                {/* Attendance Stats Row */}
                <View style={styles.attendanceDetailRow}>
                  <View style={styles.attendanceDetailItem}>
                    <View style={[styles.dot, { backgroundColor: colors.success }]} />
                    <Text style={styles.attendanceDetailText}>Có mặt: {presentCount}</Text>
                  </View>
                  <View style={styles.attendanceDetailItem}>
                    <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                    <Text style={styles.attendanceDetailText}>Đi muộn: {lateCount}</Text>
                  </View>
                  <View style={styles.attendanceDetailItem}>
                    <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                    <Text style={styles.attendanceDetailText}>Vắng: {absentCount}</Text>
                  </View>
                </View>

                <View style={styles.attendanceMetaRow}>
                  <View style={styles.metaBadge}>
                    <Feather name="award" size={13} color={colors.primary} />
                    <Text style={styles.metaBadgeText}>
                      Chuỗi: {streakWeeks ? `${streakWeeks} tuần` : '0 tuần'}
                    </Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Feather name="activity" size={13} color={colors.textMuted} />
                    <Text style={styles.metaBadgeText}>
                      RPE TB: {averageRpe !== undefined ? averageRpe : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Active Workout Plan */}
              <View style={styles.card}>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>Giáo án đang áp dụng</Text>
                </View>
                <Text numberOfLines={2} style={styles.planCardTitle}>
                  {readText(activePlan, ['title'], 'Chưa có giáo án nào đang hoạt động')}
                </Text>
                <Button label="Xem giáo án" secondary onPress={() => setSection('plans')} />
              </View>

              {/* Weight Trend Chart Preview */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sectionHeading}>XU HƯỚNG CÂN NẶNG</Text>
                  <Text style={styles.cardHeaderSub}>Biểu đồ theo thời gian</Text>
                </View>
                <MetricChart records={measurements} metric="weight" unit="kg" />
              </View>
            </View>
          )}

          {/* SECTION: TRACKING */}
          {section === 'tracking' && <TrackingSummary analytics={analytics} />}

          {/* SECTION: PLANS */}
          {section === 'plans' && <JourneyPlans plans={asRecord(journey.plans)} staff={staff} />}

          {/* SECTION: DAILY */}
          {section === 'daily' && <DailyRecords journey={journey} onSession={setDetail} />}

          {/* SECTION: SESSIONS */}
          {section === 'sessions' && (
            <View style={styles.sectionContainer}>
              {canLog && (
                <Button
                  icon="plus"
                  label="Ghi nhận buổi tập mới"
                  onPress={() => setForm({ kind: 'session' })}
                />
              )}
              {staff && !canLog && (
                <Notice text="PT sở hữu giáo án đang áp dụng mới có thể ghi nhận buổi tập tại đây." />
              )}

              <SessionCalendar
                sessions={sessions}
                selected={selectedDay}
                onSelect={setSelectedDay}
              />

              {Boolean(selectedDay) && (
                <View style={styles.selectedDayBar}>
                  <Text style={styles.selectedDayText}>
                    Đang xem ngày: {formatDate(selectedDay)}
                  </Text>
                  <Pressable
                    style={styles.clearDayBtn}
                    onPress={() => setSelectedDay('')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.clearDayBtnText}>Xem tất cả</Text>
                  </Pressable>
                </View>
              )}

              {!sessions.filter((s) => !selectedDay || dayKey(readText(s, ['performedAt'])) === selectedDay).length &&
                empty}

              {sessions
                .filter((s) => !selectedDay || dayKey(readText(s, ['performedAt'])) === selectedDay)
                .map((s) => {
                  const att = readText(s, ['attendance']);
                  const attText = ATTENDANCE[att as keyof typeof ATTENDANCE] || 'Chưa điểm danh';
                  const isPresent = att === 'PRESENT';
                  const isLate = att === 'LATE';
                  const exerciseCount = asRecords(s.exerciseLogs).length;

                  return (
                    <View key={recordId(s)} style={styles.card}>
                      <View style={styles.sessionHeaderRow}>
                        <Text numberOfLines={2} style={styles.sessionTitleText}>
                          {sessionTitle(s)}
                        </Text>
                        <View style={[
                          styles.attendanceBadge,
                          isPresent ? styles.attPresent : isLate ? styles.attLate : styles.attAbsent,
                        ]}>
                          <Text style={[
                            styles.attendanceBadgeText,
                            isPresent ? styles.attTextPresent : isLate ? styles.attTextLate : styles.attTextAbsent,
                          ]}>
                            {attText}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.sessionMetaRow}>
                        <View style={styles.sessionMetaItem}>
                          <Feather name="clock" size={13} color={colors.textMuted} />
                          <Text style={styles.sessionDateText}>
                            {formatDate(readText(s, ['performedAt']), true)}
                          </Text>
                        </View>
                        {exerciseCount > 0 && (
                          <View style={styles.sessionMetaItem}>
                            <Feather name="check-circle" size={13} color={colors.primary} />
                            <Text style={styles.sessionExerciseCount}>
                              {exerciseCount} bài tập
                            </Text>
                          </View>
                        )}
                      </View>

                      <Button secondary label="Xem chi tiết buổi tập" onPress={() => setDetail(s)} />
                    </View>
                  );
                })}
            </View>
          )}

          {/* SECTION: MEASUREMENTS */}
          {section === 'measurements' && (
            <View style={styles.sectionContainer}>
              {staff && (
                <Button
                  icon="plus"
                  label="Nhập số đo InBody mới"
                  onPress={() => setForm({ kind: 'measurement' })}
                />
              )}

              {/* Quick Metric Selector Chips */}
              <View style={styles.metricChipsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricChipsContent}>
                  {MEASUREMENTS.map(([key, title]) => {
                    const isSelected = metric === key;
                    return (
                      <Pressable
                        key={key}
                        style={[styles.metricChip, isSelected && styles.metricChipActive]}
                        onPress={() => setMetric(key)}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.metricChipText, isSelected && styles.metricChipTextActive]}>
                          {title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <MetricChart
                records={measurements}
                metric={metric}
                unit={MEASUREMENTS.find(([key]) => key === metric)?.[2] || ''}
              />

              {!measurements.length && empty}

              {measurements.map((m) => {
                const isInbody = inbodyIds.has(recordId(m));
                return (
                  <View key={recordId(m)} style={styles.card}>
                    <View style={styles.measurementHeader}>
                      <View style={styles.dateTag}>
                        <Feather name="calendar" size={13} color={colors.primary} />
                        <Text style={styles.measurementDate}>
                          {formatDate(readText(m, ['measuredAt']))}
                        </Text>
                      </View>
                      {isInbody ? (
                        <View style={styles.inbodyBadge}>
                          <Text style={styles.inbodyBadgeText}>InBody Sync</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.measurementGrid}>
                      {MEASUREMENTS.map(([key, title, unit]) => {
                        const value = readNumber(m, [key]) ?? readNumber(asRecord(m.measurements), [key]);
                        if (value === null) return null;
                        return (
                          <View key={key} style={styles.measureCell}>
                            <Text style={styles.measureLabel}>{title}</Text>
                            <Text style={styles.measureVal}>{value} {unit}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {staff && !isInbody && (
                      <View style={styles.measureActionsRow}>
                        <View style={{ flex: 1 }}>
                          <Button
                            secondary
                            icon="edit-2"
                            label="Sửa"
                            onPress={() => setForm({ kind: 'measurement', record: m })}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            secondary
                            destructive
                            icon="trash-2"
                            label="Xóa"
                            onPress={() => {
                              setActionError('');
                              setAction({
                                title: 'Xóa số đo',
                                text: 'Xóa bản ghi số đo này? Không thể khôi phục sau khi xóa.',
                                path: `/api/body-measurements/${recordId(m)}`,
                                method: 'delete',
                              });
                            }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* SECTION: ACHIEVEMENTS */}
          {section === 'achievements' && (
            <View style={styles.sectionContainer}>
              {!asRecords(analytics.achievements).length && empty}
              {asRecords(analytics.achievements).map((a, i) => (
                <View key={i} style={styles.card}>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>
                      {ACHIEVEMENTS[readText(a, ['kind'])] || 'Kỷ lục tập luyện'}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={styles.achievementTitle}>
                    {readText(a, ['exerciseName'])}
                  </Text>
                  <Text style={styles.achievementValue}>
                    {label(a.value)} {readText(a, ['unit'])}
                  </Text>
                  <Text style={styles.achievementDate}>
                    Đạt được ngày: {formatDate(readText(a, ['achievedAt']))}
                  </Text>
                  {a.isNewInPeriod === true && (
                    <View style={styles.newRecordBadge}>
                      <Text style={styles.newRecordText}>Kỷ lục mới trong kỳ</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* SECTION: PHOTOS */}
          {section === 'photos' && <PhotoGallery photos={asRecords(journey.photos)} />}

          {/* SECTION: REPORTS */}
          {section === 'reports' && (
            <View style={styles.sectionContainer}>
              {staff && (
                <View style={styles.reportActionsTop}>
                  <View style={{ flex: 1 }}>
                    <Button
                      icon="zap"
                      label="Tạo tự động"
                      onPress={() => setAutomaticReport(true)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      secondary
                      icon="plus"
                      label="Viết báo cáo"
                      onPress={() => setForm({ kind: 'report' })}
                    />
                  </View>
                </View>
              )}

              {!reports.length && empty}

              {reports.map((report) => {
                const isPublished = report.status === 'PUBLISHED';
                return (
                  <View key={recordId(report)} style={styles.card}>
                    <View style={styles.reportHeader}>
                      <View style={[styles.statusBadge, isPublished ? styles.statusPub : styles.statusDraft]}>
                        <Text style={[styles.statusText, isPublished ? styles.statusTextPub : styles.statusTextDraft]}>
                          {isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                        </Text>
                      </View>
                      <Text style={styles.reportRange}>
                        {formatDate(readText(report, ['periodStart']))} — {formatDate(readText(report, ['periodEnd']))}
                      </Text>
                    </View>

                    <Text numberOfLines={3} style={styles.reportSummary}>
                      {readText(report, ['summary'], 'Báo cáo tiến độ huấn luyện')}
                    </Text>

                    <Button
                      secondary
                      label="Đọc đầy đủ nội dung"
                      onPress={() => setDetail({ ...report, detailType: 'report' })}
                    />

                    {staff && (
                      <View style={styles.reportStaffActions}>
                        <Button
                          secondary
                          label="Sửa báo cáo"
                          onPress={() => setForm({ kind: 'report', record: report })}
                        />
                        <Button
                          label={isPublished ? 'Thu hồi xuất bản' : 'Xuất bản cho khách'}
                          onPress={() => {
                            setActionError('');
                            setAction({
                              title: isPublished ? 'Thu hồi báo cáo' : 'Xuất bản báo cáo',
                              text: isPublished
                                ? 'Học viên sẽ không còn xem được báo cáo này nữa.'
                                : 'Học viên sẽ xem được báo cáo này sau khi xuất bản.',
                              method: 'patch',
                              path: `/api/progress-reports/${recordId(report)}/${isPublished ? 'unpublish' : 'publish'}`,
                            });
                          }}
                        />
                        {!isPublished && (
                          <Button
                            secondary
                            destructive
                            label="Xóa bản nháp"
                            onPress={() => {
                              setActionError('');
                              setAction({
                                title: 'Xóa báo cáo',
                                text: 'Xóa vĩnh viễn bản nháp này?',
                                method: 'delete',
                                path: `/api/progress-reports/${recordId(report)}`,
                              });
                            }}
                          />
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Range Filter Sheet */}
      {rangeDraft && (
        <Sheet
          title="Khoảng thời gian xem"
          onClose={() => setRangeDraft(null)}
          footer={
            <View style={{ gap: 10 }}>
              <Button
                label="Áp dụng lọc"
                onPress={() => {
                  try {
                    journeyPath(undefined, rangeDraft.from, rangeDraft.to);
                    resetView();
                    setRange(rangeDraft);
                    setRangeDraft(null);
                  } catch (e) {
                    setRangeError((e as Error).message);
                  }
                }}
              />
              <Button
                secondary
                label="Xem toàn bộ lịch sử"
                onPress={() => {
                  resetView();
                  setRange({ from: '', to: '' });
                  setRangeDraft(null);
                }}
              />
            </View>
          }
        >
          <Notice text="Lọc lịch sử tập, số đo và thống kê theo ngày. Báo cáo hiển thị theo chu kỳ riêng." />
          <Field
            label="Từ ngày (YYYY-MM-DD)"
            placeholder="Để trống nếu từ đầu"
            value={rangeDraft.from}
            onChange={(from) => setRangeDraft({ ...rangeDraft, from })}
          />
          <Field
            label="Đến ngày (YYYY-MM-DD)"
            placeholder="Để trống nếu đến nay"
            value={rangeDraft.to}
            onChange={(to) => setRangeDraft({ ...rangeDraft, to })}
          />
          {rangeError ? <Notice error text={rangeError} /> : null}
        </Sheet>
      )}

      {/* Progress Form */}
      {form?.kind === 'session' ? (
        <SessionDraftForm customerId={targetId} plan={activePlan} pastSessions={sessions} onClose={closeForm} onSaved={saved} />
      ) : form && (
        <ProgressForm
          kind={form.kind}
          customerId={targetId}
          plan={activePlan}
          record={form.record}
          pastSessions={sessions}
          onClose={closeForm}
          onSaved={saved}
        />
      )}

      {/* Automatic Report */}
      {automaticReport && (
        <AutomaticReport
          customerId={targetId}
          onClose={() => setAutomaticReport(false)}
          onChanged={() => void load()}
        />
      )}

      <ProgressNotice {...popup} onClose={() => setPopup({ message: '', error: false })} />

      {/* Confirmation Action Sheet */}
      {action && (
        <Sheet
          title={action.title}
          locked={saving}
          onClose={() => setAction(null)}
          footer={
            <Button
              label="Xác nhận"
              busy={saving}
              destructive={action.method === 'delete'}
              onPress={() => void performAction()}
            />
          }
        >
          <Notice tone="warning" text={action.text} />
          {actionError ? <Notice error text={actionError} /> : null}
        </Sheet>
      )}

      {/* Detail Sheet */}
      {detail && (
        <Sheet
          title={detail.detailType === 'report' ? 'Chi tiết báo cáo tiến độ' : sessionTitle(detail)}
          onClose={() => setDetail(null)}
        >
          {detail.detailType === 'report' ? (
            <View style={{ gap: 12 }}>
              {readText(detail, ['summary'])
                .split('\n')
                .map((line, i) => (
                  <Text key={i} style={styles.sheetReportLine}>
                    {line}
                  </Text>
                ))}
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <View style={styles.sheetMetaRow}>
                <Text style={styles.sheetMetaText}>
                  {formatDate(readText(detail, ['performedAt']), true)}
                </Text>
                <Text style={styles.sheetMetaBadge}>
                  {ATTENDANCE[readText(detail, ['attendance']) as keyof typeof ATTENDANCE] || 'Đã ghi nhận'}
                </Text>
              </View>

              {asRecords(detail.exerciseLogs).map((log, i) => {
                const result = Object.keys(asRecord(log.result)).length
                  ? asRecord(log.result)
                  : { sets: log.sets };
                const rawType = readText(log, ['trackingType']);
                const type =
                  rawType === 'LEGACY_STRENGTH' || (!rawType && Array.isArray(log.sets))
                    ? 'STRENGTH'
                    : rawType;
                const rows = asRecords(result.sets).length ? asRecords(result.sets) : [result];

                return (
                  <View key={i} style={styles.exerciseLogBox}>
                    <Text style={styles.exerciseLogTitle}>
                      {readText(log, ['name'], `Bài ${i + 1}`)}
                    </Text>
                    {rows.map((row, j) => (
                      <View key={j} style={styles.setRow}>
                        {asRecords(result.sets).length > 0 && (
                          <View style={styles.setIndexBadge}>
                            <Text style={styles.setIndexText}>
                              Hiệp {j + 1} · {row.completed ? 'Hoàn thành' : 'Chưa xong'}
                            </Text>
                          </View>
                        )}
                        {(RESULT_FIELDS[type] || []).map(([key, name]) =>
                          row[key] === undefined ? null : (
                            <Text key={key} style={styles.setValueText}>
                              {name}: {label(row[key])}
                            </Text>
                          )
                        )}
                        {row.side ? (
                          <Text style={styles.setValueText}>
                            Bên: {({ LEFT: 'Trái', RIGHT: 'Phải', BOTH: 'Hai bên' } as Record<string, string>)[String(row.side)]}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                );
              })}

              {!!asRecord(detail.customerSignature).signatureUrl && (
                <View style={styles.signatureBox}>
                  <Text style={styles.signatureTitle}>Chữ ký xác nhận của học viên</Text>
                  <Image
                    source={{ uri: String(asRecord(detail.customerSignature).signatureUrl) }}
                    accessibilityLabel="Chữ ký học viên"
                    style={styles.signatureImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.signerName}>
                    {readText(asRecord(detail.customerSignature), ['signerName'])}
                  </Text>
                </View>
              )}

              {['absenceReason', 'feeling', 'notes'].map((key) => {
                const val = readText(detail, [key]);
                return val ? (
                  <View key={key} style={styles.noteBox}>
                    <Text style={styles.noteTitle}>
                      {key === 'absenceReason' ? 'Lý do vắng' : key === 'feeling' ? 'Cảm nhận' : 'Ghi chú'}:
                    </Text>
                    <Text style={styles.noteText}>{val}</Text>
                  </View>
                ) : null;
              })}
            </View>
          )}
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  workspaceContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  backNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingRight: 12,
  },
  backNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  activeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 16,
    gap: 14,
  },
  heroProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  heroIdentity: {
    flex: 1,
    gap: 3,
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  heroDateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroDateTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  heroCustomerName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  heroPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroPhoneText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statsCountersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statCounterItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statCounterValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  statCounterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statCounterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSoft,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  tabScrollWrapper: {
    marginVertical: 2,
  },
  tabScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricGrid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '48%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  metricBoxLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metricBoxValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  metricBoxUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  attendanceBarWrapper: {
    gap: 8,
  },
  attendanceBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  attendanceSegment: {
    height: '100%',
  },
  attendanceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  attendanceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  attendanceDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  attendanceMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  metaBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  planCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  selectedDayBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  clearDayBtn: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  sessionTitleText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  attendanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attPresent: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  attLate: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  attAbsent: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  attendanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  attTextPresent: {
    color: colors.success,
  },
  attTextLate: {
    color: colors.warning,
  },
  attTextAbsent: {
    color: colors.danger,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionExerciseCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  sessionDateText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  metricChipsWrapper: {
    marginVertical: 2,
  },
  metricChipsContent: {
    gap: 8,
    paddingVertical: 4,
  },
  metricChip: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricChipActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderColor: colors.primary,
  },
  metricChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metricChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  measurementDate: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  inbodyBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inbodyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measureCell: {
    width: '31%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 8,
    gap: 2,
  },
  measureLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  measureVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  measureActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  achievementValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  achievementDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  newRecordBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newRecordText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  reportActionsTop: {
    flexDirection: 'row',
    gap: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPub: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusDraft: {
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusTextPub: {
    color: colors.success,
  },
  statusTextDraft: {
    color: colors.textMuted,
  },
  reportRange: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reportSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  reportStaffActions: {
    gap: 8,
    marginTop: 4,
  },
  sheetReportLine: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  sheetMetaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sheetMetaBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  exerciseLogBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  exerciseLogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  setRow: {
    gap: 2,
    paddingVertical: 4,
  },
  setIndexBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  setIndexText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  setValueText: {
    fontSize: 13,
    color: colors.text,
  },
  signatureBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  signatureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  signatureImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  signerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  noteBox: {
    gap: 2,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  noteText: {
    fontSize: 14,
    color: colors.text,
  },
});
