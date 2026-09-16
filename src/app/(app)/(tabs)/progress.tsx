import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { LoadingState, ErrorState } from '@/components/UI';
import { Button, Sheet } from '@/components/workouts/Controls';
import { MetricChart, SessionCalendar } from '@/components/progress/ProgressVisuals';
import { PhotoGallery } from '@/components/progress/ProgressPanels';
import { ProgressWorkspace } from '../progress-workspace';
import { useAuth } from '@/context/AuthContext';
import { useJourney } from '@/context/JourneyContext';
import {
  asRecord,
  asRecords,
  formatDate,
  getLatestRecord,
  readDate,
  readNumber,
  readText,
} from '@/services/journey';
import {
  ATTENDANCE,
  dayKey,
  MEASUREMENTS,
  sessionTitle,
} from '@/services/progress';
import { recordId } from '@/services/workouts';
import { colors } from '@/theme';
import type { JsonRecord } from '@/types/domain';

type ProgressTab = 'inbody' | 'sessions' | 'photos' | 'reports';

const TAB_OPTIONS: { key: ProgressTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'inbody', label: 'Chỉ số InBody', icon: 'activity' },
  { key: 'sessions', label: 'Lịch sử tập', icon: 'calendar' },
  { key: 'photos', label: 'Ảnh tiến độ', icon: 'image' },
  { key: 'reports', label: 'Báo cáo PT', icon: 'file-text' },
];

export default function ProgressScreen() {
  const { session } = useAuth();
  const role = session?.user.role;
  const staff = role === 'PT' || role === 'ADMIN';

  // If user is staff (PT/ADMIN), display the PT Progress Workspace directly
  if (staff && session) {
    return (
      <Screen
        title="Tiến độ học viên"
        subtitle="Quản lý chỉ số InBody và buổi tập của học viên"
        onBack={() => router.navigate('/(app)/(tabs)')}
      >
        <ProgressWorkspace staff={staff} userId={session.user.id} />
      </Screen>
    );
  }

  // Customer experience
  return <CustomerProgressView />;
}

function CustomerProgressView() {
  const { journey, loading, refreshing, error, refresh } = useJourney();
  const [activeTab, setActiveTab] = useState<ProgressTab>('inbody');
  const [selectedMetric, setSelectedMetric] = useState<string>('weight');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [detailReport, setDetailReport] = useState<JsonRecord | null>(null);
  const [detailSession, setDetailSession] = useState<JsonRecord | null>(null);

  const handleBack = () => router.navigate('/(app)/(tabs)');

  if (loading && !journey) {
    return (
      <Screen title="Tiến độ & InBody" onBack={handleBack}>
        <LoadingState label="Đang tải dữ liệu tiến độ..." />
      </Screen>
    );
  }

  if (error && !journey) {
    return (
      <Screen title="Tiến độ & InBody" onBack={handleBack}>
        <ErrorState message={error} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  const measurements = asRecords(journey?.measurements);
  const inbodyRecords = asRecords(journey?.inbodyRecords);
  const allMeasurementRecords = [...measurements, ...inbodyRecords].sort((a, b) =>
    readDate(b).localeCompare(readDate(a))
  );
  const sessions = asRecords(journey?.sessions).sort((a, b) =>
    readDate(b).localeCompare(readDate(a))
  );
  const reports = asRecords(journey?.reports).filter((r) => r.status === 'PUBLISHED');
  const photos = asRecords(journey?.photos);
  const analytics = asRecord(journey?.analytics);
  const attendance = asRecord(analytics.attendance);

  const latest = getLatestRecord(measurements) || getLatestRecord(inbodyRecords);
  const weight = readNumber(latest, ['weight', 'weightKg']);
  const bodyFat = readNumber(latest, ['bodyFat', 'bodyFatPercent', 'bodyFatPercentage']);
  const muscle = readNumber(latest, ['muscleMass', 'muscleMassKg', 'skeletalMuscle']);
  const totalCount = measurements.length + inbodyRecords.length;

  return (
    <Screen
      title="Tiến độ & InBody"
      subtitle="Theo dõi cân nặng, tỷ lệ cơ và mỡ cơ thể"
      refreshing={refreshing}
      onRefresh={refresh}
      onBack={handleBack}
    >
      <View style={styles.container}>
        {/* Segmented Tab Navigation Bar */}
        <View style={styles.segmentedContainer}>
          {TAB_OPTIONS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.segmentItem, isSelected && styles.segmentItemActive]}
              >
                <Feather
                  name={tab.icon}
                  size={16}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.segmentText, isSelected && styles.segmentTextActive]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TAB 1: INBODY & CHỈ SỐ */}
        {activeTab === 'inbody' && (
          <View style={styles.tabContent}>
            {/* Hero InBody Card */}
            {latest ? (
              <View style={styles.heroInbodyCard}>
                <View style={styles.heroTopHeader}>
                  <View style={styles.dateTag}>
                    <Feather name="calendar" size={13} color={colors.primary} />
                    <Text style={styles.dateTagText}>
                      Đo ngày {formatDate(readDate(latest))}
                    </Text>
                  </View>
                  <View style={styles.measureCountTag}>
                    <Text style={styles.measureCountText}>{totalCount} lần đo</Text>
                  </View>
                </View>

                {/* Primary Weight Display */}
                <View style={styles.weightRow}>
                  <View>
                    <Text style={styles.weightLabel}>CÂN NẶNG HIỆN TẠI</Text>
                    <View style={styles.weightValueBox}>
                      <Text style={styles.weightNumber}>
                        {weight !== null ? weight : '—'}
                      </Text>
                      <Text style={styles.weightUnit}>kg</Text>
                    </View>
                  </View>
                  <View style={styles.inbodyGraphic}>
                    <View style={styles.inbodyGraphicCircle}>
                      <Feather name="maximize-2" size={28} color={colors.primary} />
                    </View>
                  </View>
                </View>

                {/* Sub Metrics Grid */}
                <View style={styles.subMetricsGrid}>
                  <View style={styles.subMetricCard}>
                    <View style={styles.subMetricHeader}>
                      <Text style={styles.subMetricLabel}>Tỷ lệ mỡ</Text>
                      <Feather name="pie-chart" size={14} color={colors.accent} />
                    </View>
                    <Text style={[styles.subMetricValue, { color: colors.accent }]}>
                      {bodyFat !== null ? `${bodyFat}%` : '—'}
                    </Text>
                  </View>

                  <View style={styles.subMetricCard}>
                    <View style={styles.subMetricHeader}>
                      <Text style={styles.subMetricLabel}>Cơ xương</Text>
                      <Feather name="zap" size={14} color={colors.success} />
                    </View>
                    <Text style={[styles.subMetricValue, { color: colors.success }]}>
                      {muscle !== null ? `${muscle} kg` : '—'}
                    </Text>
                  </View>

                  <View style={styles.subMetricCard}>
                    <View style={styles.subMetricHeader}>
                      <Text style={styles.subMetricLabel}>Đánh giá</Text>
                      <Feather name="trending-up" size={14} color={colors.primary} />
                    </View>
                    <Text style={[styles.subMetricValue, { color: colors.primary }]}>
                      Chuẩn
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Feather name="activity" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Chưa có chỉ số InBody</Text>
                <Text style={styles.emptyText}>
                  Dữ liệu đo cơ thể và InBody sẽ xuất hiện sau khi bạn hoàn thành buổi kiểm tra chỉ số cùng huấn luyện viên.
                </Text>
              </View>
            )}

            {/* Trend Chart Section */}
            {allMeasurementRecords.length > 0 && (
              <View style={styles.chartSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>BIỂU ĐỒ XU HƯỚNG</Text>
                </View>

                {/* Metric Selector Chips */}
                <View style={styles.chipRow}>
                  {[
                    { key: 'weight', label: 'Cân nặng (kg)', unit: 'kg' },
                    { key: 'bodyFatPercentage', label: 'Tỷ lệ mỡ (%)', unit: '%' },
                    { key: 'muscleMass', label: 'Cơ xương (kg)', unit: 'kg' },
                  ].map((m) => {
                    const isSelected = selectedMetric === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setSelectedMetric(m.key)}
                        style={[styles.metricChip, isSelected && styles.metricChipActive]}
                      >
                        <Text style={[styles.metricChipText, isSelected && styles.metricChipTextActive]}>
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <MetricChart
                  records={allMeasurementRecords}
                  metric={selectedMetric}
                  unit={selectedMetric === 'bodyFatPercentage' ? '%' : 'kg'}
                />
              </View>
            )}

            {/* Detailed Body Measurements Table */}
            {latest && (
              <View style={styles.bodyDetailsCard}>
                <Text style={styles.sectionTitle}>SỐ ĐO CƠ THỂ CHI TIẾT</Text>
                <View style={styles.measurementsGrid}>
                  {MEASUREMENTS.map(([key, label, unit]) => {
                    const val =
                      readNumber(latest, [key]) ??
                      readNumber(asRecord(latest.measurements), [key]);
                    if (val === null) return null;
                    return (
                      <View key={key} style={styles.measureGridItem}>
                        <Text style={styles.measureItemLabel}>{label}</Text>
                        <Text style={styles.measureItemValue}>
                          {val} <Text style={styles.measureItemUnit}>{unit}</Text>
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: LỊCH SỬ TẬP */}
        {activeTab === 'sessions' && (
          <View style={styles.tabContent}>
            {/* Attendance Quick Stats */}
            <View style={styles.attendanceStatsCard}>
              <View style={styles.attStatCol}>
                <Text style={styles.attStatNum}>
                  {String(analytics.totalSessions ?? sessions.length)}
                </Text>
                <Text style={styles.attStatLbl}>Tổng số buổi</Text>
              </View>
              <View style={styles.attStatDiv} />
              <View style={styles.attStatCol}>
                <Text style={[styles.attStatNum, { color: colors.success }]}>
                  {String(attendance.present ?? '—')}
                </Text>
                <Text style={styles.attStatLbl}>Có mặt</Text>
              </View>
              <View style={styles.attStatDiv} />
              <View style={styles.attStatCol}>
                <Text style={[styles.attStatNum, { color: colors.primary }]}>
                  {attendance.rate ? `${String(attendance.rate)}%` : '—'}
                </Text>
                <Text style={styles.attStatLbl}>Tỷ lệ tham gia</Text>
              </View>
            </View>

            {/* Session Calendar */}
            <SessionCalendar
              sessions={sessions}
              selected={selectedDay}
              onSelect={setSelectedDay}
            />

            {/* Sessions List */}
            <View style={styles.sessionsListSection}>
              <Text style={styles.sectionTitle}>BUỔI TẬP ĐÃ GHI NHẬN</Text>
              {!sessions.filter((s) => !selectedDay || dayKey(readDate(s)) === selectedDay).length ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Không có buổi tập nào</Text>
                  <Text style={styles.emptyText}>
                    Chưa có buổi tập nào được ghi nhận trong ngày này.
                  </Text>
                </View>
              ) : (
                sessions
                  .filter((s) => !selectedDay || dayKey(readDate(s)) === selectedDay)
                  .map((sessionItem) => {
                    const att = readText(sessionItem, ['attendance']);
                    const isPresent = att === 'PRESENT';
                    const isLate = att === 'LATE';
                    const attLabel = ATTENDANCE[att as keyof typeof ATTENDANCE] || 'Đã ghi nhận';
                    const exLogs = asRecords(sessionItem.exerciseLogs);

                    return (
                      <View key={recordId(sessionItem)} style={styles.sessionCard}>
                        <View style={styles.sessionTopRow}>
                          <Text numberOfLines={2} style={styles.sessionCardTitle}>
                            {sessionTitle(sessionItem)}
                          </Text>
                          <View style={[
                            styles.attBadge,
                            isPresent ? styles.attBadgePres : isLate ? styles.attBadgeLate : styles.attBadgeAbs,
                          ]}>
                            <Text style={[
                              styles.attBadgeTxt,
                              isPresent ? styles.attTxtPres : isLate ? styles.attTxtLate : styles.attTxtAbs,
                            ]}>
                              {attLabel}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.sessionDateRow}>
                          <Feather name="clock" size={14} color={colors.textMuted} />
                          <Text style={styles.sessionDateTxt}>
                            {formatDate(readDate(sessionItem), true)}
                          </Text>
                          {exLogs.length > 0 && (
                            <Text style={styles.sessionDateTxt}>
                              · {exLogs.length} bài tập
                            </Text>
                          )}
                        </View>

                        <Button
                          secondary
                          label="Xem chi tiết buổi tập"
                          onPress={() => setDetailSession(sessionItem)}
                        />
                      </View>
                    );
                  })
              )}
            </View>
          </View>
        )}

        {/* TAB 3: ẢNH TIẾN ĐỘ */}
        {activeTab === 'photos' && (
          <View style={styles.tabContent}>
            <PhotoGallery photos={photos} />
          </View>
        )}

        {/* TAB 4: BÁO CÁO PT */}
        {activeTab === 'reports' && (
          <View style={styles.tabContent}>
            {!reports.length ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Feather name="file-text" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Chưa có báo cáo từ PT</Text>
                <Text style={styles.emptyText}>
                  Huấn luyện viên sẽ định kỳ gửi bản tổng kết và đánh giá tiến độ tập luyện của bạn tại đây.
                </Text>
              </View>
            ) : (
              reports.map((report, index) => (
                <View key={readText(report, ['id', 'uuid'], `report-${index}`)} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <View style={styles.reportBadge}>
                      <Text style={styles.reportBadgeText}>Báo cáo tiến độ</Text>
                    </View>
                    <Text style={styles.reportDate}>
                      {formatDate(readDate(report))}
                    </Text>
                  </View>

                  <Text numberOfLines={1} style={styles.reportTitle}>
                    {readText(report, ['title', 'name'], 'Báo cáo định kỳ')}
                  </Text>

                  <Text numberOfLines={3} style={styles.reportSummary}>
                    {readText(
                      report,
                      ['summary', 'content', 'notes', 'description'],
                      'PT đã cập nhật một báo cáo mới cho bạn.'
                    )}
                  </Text>

                  <Button
                    secondary
                    label="Đọc toàn bộ báo cáo"
                    onPress={() => setDetailReport(report)}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Detail Report Sheet */}
      {detailReport && (
        <Sheet
          title="Báo cáo tiến độ tập luyện"
          onClose={() => setDetailReport(null)}
        >
          <View style={{ gap: 14 }}>
            <View style={styles.sheetMetaRow}>
              <Text style={styles.sheetMetaDate}>
                {formatDate(readText(detailReport, ['periodStart']))} — {formatDate(readText(detailReport, ['periodEnd']))}
              </Text>
              <View style={styles.reportBadge}>
                <Text style={styles.reportBadgeText}>Huấn luyện viên</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {readText(detailReport, ['summary', 'content', 'notes'])
                .split('\n')
                .map((paragraph, i) => (
                  <Text key={i} style={styles.sheetReportText}>
                    {paragraph}
                  </Text>
                ))}
            </View>
          </View>
        </Sheet>
      )}

      {/* Detail Session Sheet */}
      {detailSession && (
        <Sheet
          title={sessionTitle(detailSession)}
          onClose={() => setDetailSession(null)}
        >
          <View style={{ gap: 14 }}>
            <View style={styles.sheetMetaRow}>
              <Text style={styles.sheetMetaDate}>
                {formatDate(readDate(detailSession), true)}
              </Text>
              <Text style={styles.sessionStatusBadgeText}>
                {ATTENDANCE[readText(detailSession, ['attendance']) as keyof typeof ATTENDANCE] || 'Đã tập'}
              </Text>
            </View>

            {asRecords(detailSession.exerciseLogs).map((log, i) => {
              const result = asRecord(log.result);
              const sets = asRecords(result.sets);
              return (
                <View key={i} style={styles.exLogCard}>
                  <Text style={styles.exLogTitle}>
                    {readText(log, ['name'], `Bài tập ${i + 1}`)}
                  </Text>
                  {sets.map((set, j) => (
                    <View key={j} style={styles.setRowItem}>
                      <Text style={styles.setRowNumber}>Hiệp {j + 1}:</Text>
                      <Text style={styles.setRowDetail}>
                        {readNumber(set, ['reps']) ? `${readNumber(set, ['reps'])} lần` : ''}
                        {readNumber(set, ['weight']) ? ` · ${readNumber(set, ['weight'])} kg` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </Sheet>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    minHeight: 44,
  },
  segmentItemActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    gap: 16,
  },
  heroInbodyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 20,
    gap: 16,
  },
  heroTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  measureCountTag: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  measureCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  weightValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  weightNumber: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    color: colors.text,
  },
  weightUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMuted,
  },
  inbodyGraphic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inbodyGraphicCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  subMetricCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  subMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  subMetricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  chartSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
    justifyContent: 'center',
  },
  metricChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  metricChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metricChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bodyDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measureGridItem: {
    width: '48%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  measureItemLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  measureItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  measureItemUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  attendanceStatsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  attStatCol: {
    alignItems: 'center',
    gap: 4,
  },
  attStatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  attStatLbl: {
    fontSize: 12,
    color: colors.textMuted,
  },
  attStatDiv: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSoft,
  },
  sessionsListSection: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  sessionCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  attBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attBadgePres: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  attBadgeLate: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  attBadgeAbs: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  attBadgeTxt: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  attTxtPres: {
    color: colors.success,
  },
  attTxtLate: {
    color: colors.warning,
  },
  attTxtAbs: {
    color: colors.danger,
  },
  sessionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDateTxt: {
    fontSize: 13,
    color: colors.textMuted,
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reportBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  reportDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  reportSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  sheetMetaDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sheetReportText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  sessionStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  exLogCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  exLogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  setRowItem: {
    flexDirection: 'row',
    gap: 6,
  },
  setRowNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  setRowDetail: {
    fontSize: 13,
    color: colors.text,
  },
});
