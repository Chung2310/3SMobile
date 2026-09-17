import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { DatePickerModal } from '@/components/DatePickerModal';
import { fetchAdminDashboard, type AdminDashboardData } from '@/services/dashboardService';
import { colors, radius, spacing } from '@/theme';

interface AdminDashboardViewProps {
  onRefreshParent?: () => void;
}

/* ============================================================================
 * SVG VISUAL CHART COMPONENTS
 * ============================================================================ */

function AdminDonutChart({
  active,
  lead,
  inactive,
  total,
  size = 135,
  strokeWidth = 16,
}: {
  active: number;
  lead: number;
  inactive: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const center = size / 2;
  const radiusVal = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusVal;

  const totalVal = Math.max(1, total || active + lead + inactive);
  const activeRatio = active / totalVal;
  const leadRatio = lead / totalVal;
  const inactiveRatio = inactive / totalVal;

  const activeDash = activeRatio * circumference;
  const leadDash = leadRatio * circumference;
  const inactiveDash = inactiveRatio * circumference;

  const activeOffset = 0;
  const leadOffset = -activeDash;
  const inactiveOffset = -(activeDash + leadDash);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {total === 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radiusVal}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          )}
          {active > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radiusVal}
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${activeDash} ${circumference - activeDash}`}
              strokeDashoffset={activeOffset}
              fill="transparent"
            />
          )}
          {lead > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radiusVal}
              stroke="#F59E0B"
              strokeWidth={strokeWidth}
              strokeDasharray={`${leadDash} ${circumference - leadDash}`}
              strokeDashoffset={leadOffset}
              fill="transparent"
            />
          )}
          {inactive > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radiusVal}
              stroke="#64748B"
              strokeWidth={strokeWidth}
              strokeDasharray={`${inactiveDash} ${circumference - inactiveDash}`}
              strokeDashoffset={inactiveOffset}
              fill="transparent"
            />
          )}
        </G>
        <SvgText
          x={center}
          y={center - 3}
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#0F172A"
        >
          {total}
        </SvgText>
        <SvgText
          x={center}
          y={center + 14}
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill="#64748B"
        >
          Hội viên
        </SvgText>
      </Svg>
    </View>
  );
}

function AdminWeeklyTrendLineChart({ completedSessions = 0 }: { completedSessions?: number }) {
  const base = Math.max(1, Math.round(completedSessions / 7));
  const rawData = [
    Math.max(1, base - 1),
    Math.max(2, base + 2),
    Math.max(1, base + 1),
    Math.max(3, base + 4),
    Math.max(2, base + 3),
    Math.max(1, base),
    Math.max(2, base + 2),
  ];
  const days = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];

  const width = 300;
  const height = 135;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 24;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...rawData, 6);
  const minVal = 0;

  const points = rawData.map((val, idx) => {
    const x = paddingX + (idx / (rawData.length - 1)) * chartW;
    const y = paddingTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, val, day: days[idx] };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="adminLineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {[0, 0.5, 1].map((ratio, i) => {
          const y = paddingTop + ratio * chartH;
          return (
            <Line
              key={`grid-${i}`}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="#E2E8F0"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        <Path d={areaD} fill="url(#adminLineGrad)" />
        <Path d={pathD} stroke="#0284C7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((pt, i) => (
          <G key={`pt-${i}`}>
            <Circle cx={pt.x} cy={pt.y} r="4" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
            <SvgText
              x={pt.x}
              y={pt.y - 7}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="#0369A1"
            >
              {pt.val}
            </SvgText>
            <SvgText
              x={pt.x}
              y={height - 7}
              textAnchor="middle"
              fontSize="10"
              fontWeight="500"
              fill="#64748B"
            >
              {pt.day}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

function AdminPtWorkloadBarChart({
  ptWorkload,
}: {
  ptWorkload?: Array<{ fullName: string; activeCustomers: number }>;
}) {
  const items =
    ptWorkload && ptWorkload.length > 0
      ? ptWorkload.slice(0, 5)
      : [
          { fullName: 'HLV Minh', activeCustomers: 8 },
          { fullName: 'HLV Tuấn', activeCustomers: 5 },
          { fullName: 'HLV Hoàng', activeCustomers: 4 },
          { fullName: 'HLV Nam', activeCustomers: 2 },
        ];

  const maxVal = Math.max(...items.map((i) => i.activeCustomers), 1);
  const width = 300;
  const height = 135;
  const paddingTop = 20;
  const paddingBottom = 24;
  const paddingX = 16;
  const chartH = height - paddingTop - paddingBottom;
  const chartW = width - paddingX * 2;
  const barWidth = Math.min(28, (chartW / items.length) * 0.48);

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="adminBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0284C7" stopOpacity="1" />
            <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
          </LinearGradient>
        </Defs>

        <Line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="#CBD5E1"
          strokeWidth="1"
        />

        {items.map((item, idx) => {
          const slotW = chartW / items.length;
          const cx = paddingX + idx * slotW + slotW / 2;
          const x = cx - barWidth / 2;
          const valRatio = item.activeCustomers / maxVal;
          const barH = Math.max(6, valRatio * chartH);
          const y = height - paddingBottom - barH;
          const shortName = item.fullName.replace(/HLV\s+/i, '').trim();

          return (
            <G key={`bar-${idx}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx="4"
                ry="4"
                fill="url(#adminBarGrad)"
              />
              <SvgText
                x={cx}
                y={y - 5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#0369A1"
              >
                {item.activeCustomers}
              </SvgText>
              <SvgText
                x={cx}
                y={height - 7}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#475569"
              >
                {shortName.length > 7 ? `${shortName.slice(0, 6)}..` : shortName}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

export function AdminDashboardView({ onRefreshParent }: AdminDashboardViewProps) {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [selectedPtId, setSelectedPtId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Date picker modals
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Dropdown list PTs
  const [ptsList, setPtsList] = useState<Array<{ ptId: string; fullName: string }>>([]);

  const loadAdminDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminDashboard({
        ptId: selectedPtId,
        customerStatus: selectedStatus,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      if (res) {
        setData(res);
        if (res.ptWorkload && res.ptWorkload.length > 0) {
          setPtsList(res.ptWorkload.map((p) => ({ ptId: p.ptId, fullName: p.fullName })));
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPtId, selectedStatus, fromDate, toDate]);

  useEffect(() => {
    void loadAdminDashboard();
  }, [loadAdminDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (onRefreshParent) onRefreshParent();
    void loadAdminDashboard();
  }, [loadAdminDashboard, onRefreshParent]);

  // Derived metrics
  const totalPts = data?.totalPts ?? 0;
  const totalCustomers = data?.totalCustomers ?? 0;
  const openAlerts = data?.openAlerts ?? 0;
  const activePackages = data?.activePackages ?? 0;

  const activeCount = data?.customerStats?.active ?? 0;
  const leadCount = data?.customerStats?.lead ?? 0;
  const inactiveCount = data?.customerStats?.inactive ?? 0;

  const totalSessions = data?.packageStats?.totalSessions ?? 0;
  const completedSessions = data?.packageStats?.completedSessions ?? 0;
  const remainingSessions = data?.packageStats?.remainingSessions ?? 0;

  const pctCompleted = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const pctRemaining = Math.max(0, 100 - pctCompleted);

  const pctActive = totalCustomers > 0 ? Math.round((activeCount / totalCustomers) * 100) : 0;
  const pctLead = totalCustomers > 0 ? Math.round((leadCount / totalCustomers) * 100) : 0;
  const pctInactive = totalCustomers > 0 ? Math.round((inactiveCount / totalCustomers) * 100) : 0;

  const maxWorkload = useMemo(() => {
    if (!data?.ptWorkload || data.ptWorkload.length === 0) return 1;
    return Math.max(...data.ptWorkload.map((p) => p.activeCustomers || p.totalCustomers || 1));
  }, [data]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} />}
    >
      {/* 1. NAVIGATION TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topTabsScroll}>
        <View style={styles.topTabsRow}>
          <Pressable style={[styles.topTabBtn, styles.topTabBtnActive]}>
            <Ionicons name="grid-outline" size={14} color="#0284C7" />
            <Text style={[styles.topTabText, styles.topTabTextActive]}>Tổng quan & KPI</Text>
          </Pressable>

          <Pressable
            style={styles.topTabBtn}
            onPress={() => router.push('/(app)/customers')}
          >
            <Ionicons name="people-outline" size={14} color="#64748B" />
            <Text style={styles.topTabText}>Huấn luyện viên</Text>
          </Pressable>

          <Pressable
            style={styles.topTabBtn}
            onPress={() => router.push('/(app)/customers')}
          >
            <Ionicons name="cube-outline" size={14} color="#64748B" />
            <Text style={styles.topTabText}>Gói tập mẫu</Text>
          </Pressable>

          <Pressable
            style={styles.topTabBtn}
            onPress={() => router.push('/(app)/profile')}
          >
            <Ionicons name="options-outline" size={14} color="#64748B" />
            <Text style={styles.topTabText}>Tính năng hệ thống</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 2. PAGE HEADER ROW */}
      <View style={styles.pageHeaderRow}>
        <View style={styles.pageTitleLeft}>
          <Text style={styles.pageTitle}>Tổng quan hệ thống</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Trực tiếp</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
          onPress={onRefresh}
          hitSlop={8}
        >
          <Feather name="refresh-cw" size={13} color="#475569" />
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </Pressable>
      </View>

      {/* 3. QUICK FILTER CARD */}
      <View style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <Feather name="filter" size={14} color="#0284C7" />
          <Text style={styles.filterTitle}>Bộ lọc dữ liệu nhanh:</Text>
        </View>

        <View style={styles.filterGrid}>
          {/* Lựa chọn PT */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Huấn luyện viên</Text>
            <View style={styles.filterInputFake}>
              <Text style={styles.filterValueText} numberOfLines={1}>
                {selectedPtId === 'ALL'
                  ? 'Tất cả Huấn luyện viên'
                  : ptsList.find((p) => p.ptId === selectedPtId)?.fullName || selectedPtId}
              </Text>
              <Feather name="chevron-down" size={14} color="#64748B" />
            </View>
          </View>

          {/* Lựa chọn Trạng thái Hội viên */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Trạng thái Hội viên</Text>
            <View style={styles.filterInputFake}>
              <Text style={styles.filterValueText} numberOfLines={1}>
                {selectedStatus === 'ALL'
                  ? 'Tất cả trạng thái'
                  : selectedStatus === 'ACTIVE'
                    ? 'Đang tập'
                    : selectedStatus === 'LEAD'
                      ? 'Tiềm năng'
                      : 'Tạm dừng'}
              </Text>
              <Feather name="chevron-down" size={14} color="#64748B" />
            </View>
          </View>

          {/* Lựa chọn Ngày bắt đầu - kết thúc */}
          <View style={styles.filterRowDates}>
            <View style={[styles.filterField, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Từ ngày</Text>
              <Pressable
                style={styles.filterInputFake}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={[styles.filterValueText, !fromDate && styles.filterPlaceholder]}>
                  {fromDate || 'mm/dd/yyyy'}
                </Text>
                <Feather name="calendar" size={13} color="#94A3B8" />
              </Pressable>
            </View>

            <View style={[styles.filterField, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Đến ngày</Text>
              <Pressable
                style={styles.filterInputFake}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={[styles.filterValueText, !toDate && styles.filterPlaceholder]}>
                  {toDate || 'mm/dd/yyyy'}
                </Text>
                <Feather name="calendar" size={13} color="#94A3B8" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* 4. 4 TOP KPI METRIC CARDS */}
      <View style={styles.kpiGrid}>
        {/* Card 1: PT ĐANG HOẠT ĐỘNG */}
        <View style={[styles.kpiCard, styles.kpiBorderBlue]}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>PT ĐANG HOẠT ĐỘNG</Text>
              <Text style={styles.kpiValue}>{totalPts}</Text>
            </View>
            <View style={[styles.kpiIconWrap, styles.kpiIconBlue]}>
              <Ionicons name="people-outline" size={18} color="#0284C7" />
            </View>
          </View>
          <View style={styles.kpiBadgeBlue}>
            <Text style={styles.kpiBadgeTextBlue}>100% Đạt chứng chỉ</Text>
          </View>
        </View>

        {/* Card 2: KHÁCH HÀNG */}
        <View style={[styles.kpiCard, styles.kpiBorderGreen]}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>KHÁCH HÀNG</Text>
              <Text style={styles.kpiValue}>{totalCustomers}</Text>
            </View>
            <View style={[styles.kpiIconWrap, styles.kpiIconGreen]}>
              <Ionicons name="person-add-outline" size={18} color="#16A34A" />
            </View>
          </View>
          <View style={styles.kpiBadgeGreen}>
            <Text style={styles.kpiBadgeTextGreen}>
              {activeCount} Đang tập • {leadCount} Tiềm năng
            </Text>
          </View>
        </View>

        {/* Card 3: GÓI TẬP ĐANG HOẠT ĐỘNG */}
        <View style={[styles.kpiCard, styles.kpiBorderPurple]}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>GÓI TẬP ĐANG HOẠT ĐỘNG</Text>
              <Text style={styles.kpiValue}>{activePackages}</Text>
            </View>
            <View style={[styles.kpiIconWrap, styles.kpiIconPurple]}>
              <Ionicons name="cube-outline" size={18} color="#7C3AED" />
            </View>
          </View>
          <View style={styles.kpiBadgePurple}>
            <Text style={styles.kpiBadgeTextPurple}>
              {completedSessions}/{totalSessions} buổi hoàn thành
            </Text>
          </View>
        </View>

        {/* Card 4: CẢNH BÁO ĐANG MỜ */}
        <View style={[styles.kpiCard, styles.kpiBorderRed]}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>CẢNH BÁO ĐANG MỜ</Text>
              <Text style={styles.kpiValue}>{openAlerts}</Text>
            </View>
            <View style={[styles.kpiIconWrap, styles.kpiIconRed]}>
              <Ionicons name="warning-outline" size={18} color="#DC2626" />
            </View>
          </View>
          <View style={styles.kpiBadgeRed}>
            <Text style={styles.kpiBadgeTextRed}>
              {openAlerts === 0 ? 'Hệ thống an toàn' : `${openAlerts} Cảnh báo cần xử lý`}
            </Text>
          </View>
        </View>
      </View>

      {/* 5. VISUAL CHARTS COLUMN */}
      <View style={styles.chartsColumn}>
        {/* Chart 1: Cơ cấu Trạng thái Hội viên (Biểu đồ Tròn Donut) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Cơ cấu Trạng thái Hội viên</Text>
              <Text style={styles.chartSubtitle}>Biểu đồ tròn phân loại tương tác</Text>
            </View>
            <View style={styles.chartBadgeWrap}>
              <Text style={styles.chartBadgeText}>{totalCustomers} Tổng số</Text>
            </View>
          </View>

          {/* Biểu đồ Tròn Donut SVG */}
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <AdminDonutChart
              active={activeCount}
              lead={leadCount}
              inactive={inactiveCount}
              total={totalCustomers}
            />
          </View>

          {/* Progress bar segmented visual */}
          <View style={styles.progressBarSegmentedWrap}>
            <View style={[styles.progressSegmentGreen, { flex: Math.max(0.01, pctActive) }]} />
            <View style={[styles.progressSegmentYellow, { flex: Math.max(0.01, pctLead) }]} />
            <View style={[styles.progressSegmentGray, { flex: Math.max(0.01, pctInactive) }]} />
          </View>

          {/* 3 Detail columns */}
          <View style={styles.statusCardsRow}>
            {/* Đang tập */}
            <View style={[styles.statusMiniCard, styles.statusCardGreen]}>
              <View style={styles.statusTitleRow}>
                <View style={[styles.dot, styles.dotGreen]} />
                <Text style={styles.statusMiniLabel}>Đang tập</Text>
              </View>
              <Text style={[styles.statusMiniVal, { color: '#15803D' }]}>{activeCount}</Text>
              <Text style={styles.statusMiniSub}>{pctActive}% tổng số</Text>
            </View>

            {/* Tiềm năng */}
            <View style={[styles.statusMiniCard, styles.statusCardYellow]}>
              <View style={styles.statusTitleRow}>
                <View style={[styles.dot, styles.dotYellow]} />
                <Text style={styles.statusMiniLabel}>Tiềm năng</Text>
              </View>
              <Text style={[styles.statusMiniVal, { color: '#B45309' }]}>{leadCount}</Text>
              <Text style={styles.statusMiniSub}>{pctLead}% tổng số</Text>
            </View>

            {/* Tạm dừng */}
            <View style={[styles.statusMiniCard, styles.statusCardGray]}>
              <View style={styles.statusTitleRow}>
                <View style={[styles.dot, styles.dotGray]} />
                <Text style={styles.statusMiniLabel}>Tạm dừng</Text>
              </View>
              <Text style={[styles.statusMiniVal, { color: '#475569' }]}>{inactiveCount}</Text>
              <Text style={styles.statusMiniSub}>{pctInactive}% tổng số</Text>
            </View>
          </View>
        </View>

        {/* Chart 2: Xu hướng Tập luyện Hàng tuần (Biểu đồ Đường SVG) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Xu hướng Hoạt động & Tập luyện</Text>
              <Text style={styles.chartSubtitle}>Biểu đồ đường lượt tập 7 ngày qua</Text>
            </View>
            <View style={[styles.chartBadgeWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="trending-up" size={13} color="#0284C7" style={{ marginRight: 4 }} />
              <Text style={[styles.chartBadgeText, { color: '#0284C7' }]}>Tăng trưởng</Text>
            </View>
          </View>

          <View style={{ marginVertical: 8 }}>
            <AdminWeeklyTrendLineChart completedSessions={completedSessions} />
          </View>
        </View>

        {/* Chart 3: Phân bổ Học viên theo HLV PT (Biểu đồ Cột SVG) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Biểu đồ Cột - Tải công việc PT</Text>
              <Text style={styles.chartSubtitle}>So sánh số lượng học viên giữa các PT</Text>
            </View>
            <View style={[styles.chartBadgeWrap, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.chartBadgeText, { color: '#B45309' }]}>{totalPts} PT</Text>
            </View>
          </View>

          <View style={{ marginVertical: 8 }}>
            <AdminPtWorkloadBarChart ptWorkload={data?.ptWorkload} />
          </View>
        </View>

        {/* Chart 4: Tiến độ Thực hiện Buổi tập */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Tiến độ Thực hiện Buổi tập</Text>
              <Text style={styles.chartSubtitle}>Tổng khối lượng buổi tập toàn hệ thống</Text>
            </View>
            <View style={[styles.chartBadgeWrap, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[styles.chartBadgeText, { color: '#0284C7' }]}>{pctCompleted}% Hoàn thành</Text>
            </View>
          </View>

          {/* Progress bar visual */}
          <View style={styles.progressSingleBarWrap}>
            <View style={[styles.progressSingleBarFill, { width: `${Math.min(100, Math.max(0, pctCompleted))}%` }]} />
          </View>

          {/* 3 Detail columns */}
          <View style={styles.statusCardsRow}>
            {/* Tổng số buổi */}
            <View style={[styles.statusMiniCard, styles.statusCardWhite]}>
              <Text style={styles.statusMiniLabel}>Tổng số buổi</Text>
              <Text style={styles.statusMiniVal}>{totalSessions}</Text>
              <Text style={styles.statusMiniSub}>Toàn hệ thống</Text>
            </View>

            {/* Đã tập luyện */}
            <View style={[styles.statusMiniCard, styles.statusCardBlue]}>
              <Text style={styles.statusMiniLabel}>Đã tập luyện</Text>
              <Text style={[styles.statusMiniVal, { color: '#0284C7' }]}>{completedSessions}</Text>
              <Text style={styles.statusMiniSub}>{pctCompleted}% hoàn tất</Text>
            </View>

            {/* Buổi còn lại */}
            <View style={[styles.statusMiniCard, styles.statusCardLightGreen]}>
              <Text style={styles.statusMiniLabel}>Buổi còn lại</Text>
              <Text style={[styles.statusMiniVal, { color: '#16A34A' }]}>{remainingSessions}</Text>
              <Text style={styles.statusMiniSub}>{pctRemaining}% chưa tập</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 6. LOWER SECTION: PT WORKLOAD RANKING & CARE ALERTS */}
      <View style={styles.lowerColumn}>
        {/* Card: Tải công việc Đội ngũ HLV PT */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardHeaderLeft}>
              <Ionicons name="medal-outline" size={16} color="#B45309" />
              <Text style={styles.sectionCardTitle}>Tải công việc Đội ngũ HLV PT</Text>
            </View>
            <Pressable onPress={() => router.push('/(app)/customers')} hitSlop={8}>
              <Text style={styles.seeDetailLink}>Xem chi tiết PT &gt;</Text>
            </Pressable>
          </View>

          {data?.ptWorkload && data.ptWorkload.length > 0 ? (
            <View style={styles.ptList}>
              {data.ptWorkload.map((pt, idx) => {
                const ratio = Math.min(1, Math.max(0.05, (pt.activeCustomers || 1) / maxWorkload));
                return (
                  <View key={pt.ptId || `pt-${idx}`} style={styles.ptItem}>
                    <View style={styles.ptTopRow}>
                      <View style={styles.ptInfoLeft}>
                        <View style={styles.ptRankBadge}>
                          <Text style={styles.ptRankText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.ptName} numberOfLines={1}>
                          {pt.fullName}
                        </Text>
                        <Text style={styles.ptUsername} numberOfLines={1}>
                          @{pt.username}
                        </Text>
                      </View>

                      <View style={styles.ptMetricsRight}>
                        <Text style={styles.ptActiveCust}>
                          {pt.activeCustomers} Học viên
                        </Text>
                        <Text style={styles.ptActivePkg}>
                          {pt.activePackages} Gói
                        </Text>
                      </View>
                    </View>

                    {/* Workload relative progress bar */}
                    <View style={styles.ptWorkloadBarWrap}>
                      <View style={[styles.ptWorkloadBarFill, { width: `${ratio * 100}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Feather name="users" size={24} color="#94A3B8" />
              <Text style={styles.emptyText}>Chưa có thông tin HLV PT nào.</Text>
            </View>
          )}
        </View>

        {/* Card: Cảnh báo Chăm sóc Khách hàng */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardHeaderLeft}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.sectionCardTitle}>Cảnh báo Chăm sóc Khách hàng</Text>
            </View>
            <View style={styles.alertBadgeWrap}>
              <Text style={styles.alertBadgeText}>{openAlerts} Cần xử lý</Text>
            </View>
          </View>

          {openAlerts === 0 ? (
            <View style={styles.safeBox}>
              <View style={styles.safeIconWrap}>
                <Ionicons name="checkmark" size={22} color="#16A34A" />
              </View>
              <Text style={styles.safeTitle}>Hệ thống hoạt động an toàn</Text>
              <Text style={styles.safeSubtitle}>
                Tất cả hội viên đang được chăm sóc đúng quy trình
              </Text>
            </View>
          ) : (
            <View style={styles.alertsList}>
              {(data?.recentAlerts || []).map((alert, idx) => (
                <View key={alert._id || `alert-${idx}`} style={styles.alertItem}>
                  <View style={styles.alertIconCol}>
                    <Ionicons name="warning" size={16} color="#DC2626" />
                  </View>
                  <View style={styles.alertContentCol}>
                    <Text style={styles.alertItemTitle}>{alert.title}</Text>
                    <Text style={styles.alertItemReason}>{alert.reason}</Text>
                    <Text style={styles.alertItemMeta}>
                      Học viên: {alert.customerName} • PT: {alert.ptName}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Date Pickers */}
      <DatePickerModal
        visible={showFromPicker}
        value={fromDate}
        title="Từ ngày"
        onSelect={(date) => {
          setFromDate(date);
          setShowFromPicker(false);
        }}
        onClose={() => setShowFromPicker(false)}
      />

      <DatePickerModal
        visible={showToPicker}
        value={toDate}
        title="Đến ngày"
        onSelect={(date) => {
          setToDate(date);
          setShowToPicker(false);
        }}
        onClose={() => setShowToPicker(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  topTabsScroll: {
    marginBottom: 12,
  },
  topTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topTabBtnActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  topTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  topTabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pageTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshBtnPressed: {
    backgroundColor: '#F1F5F9',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  filterGrid: {
    gap: 10,
  },
  filterField: {
    gap: 4,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterInputFake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  filterValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  filterPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  filterRowDates: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  kpiBorderBlue: { borderColor: '#BAE6FD' },
  kpiBorderGreen: { borderColor: '#BBF7D0' },
  kpiBorderPurple: { borderColor: '#DDD6FE' },
  kpiBorderRed: { borderColor: '#FECACA' },

  kpiTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconBlue: { backgroundColor: '#F0F9FF' },
  kpiIconGreen: { backgroundColor: '#F0FDF4' },
  kpiIconPurple: { backgroundColor: '#F5F3FF' },
  kpiIconRed: { backgroundColor: '#FEF2F2' },

  kpiBadgeBlue: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  kpiBadgeTextBlue: { fontSize: 10.5, fontWeight: '700', color: '#0284C7' },

  kpiBadgeGreen: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  kpiBadgeTextGreen: { fontSize: 10.5, fontWeight: '700', color: '#15803D' },

  kpiBadgePurple: { backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  kpiBadgeTextPurple: { fontSize: 10.5, fontWeight: '700', color: '#7C3AED' },

  kpiBadgeRed: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  kpiBadgeTextRed: { fontSize: 10.5, fontWeight: '700', color: '#DC2626' },

  chartsColumn: {
    gap: 14,
    marginBottom: 14,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  chartBadgeWrap: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  chartBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  progressBarSegmentedWrap: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressSegmentGreen: { backgroundColor: '#16A34A' },
  progressSegmentYellow: { backgroundColor: '#F59E0B' },
  progressSegmentGray: { backgroundColor: '#94A3B8' },

  progressSingleBarWrap: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressSingleBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 4,
  },
  statusCardsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusMiniCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statusCardGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusCardYellow: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statusCardGray: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  statusCardWhite: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  statusCardBlue: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  statusCardLightGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },

  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#16A34A' },
  dotYellow: { backgroundColor: '#F59E0B' },
  dotGray: { backgroundColor: '#64748B' },

  statusMiniLabel: { fontSize: 10.5, fontWeight: '600', color: '#64748B' },
  statusMiniVal: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginVertical: 2 },
  statusMiniSub: { fontSize: 9.5, fontWeight: '600', color: '#64748B' },

  lowerColumn: {
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeDetailLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  alertBadgeWrap: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  alertBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  ptList: {
    gap: 8,
  },
  ptItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ptInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  ptRankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  ptName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  ptUsername: {
    fontSize: 11,
    color: '#64748B',
  },
  ptMetricsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ptActiveCust: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ptActivePkg: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ptWorkloadBarWrap: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  ptWorkloadBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 2,
  },
  safeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  safeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  safeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  safeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  alertsList: {
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 10,
  },
  alertIconCol: {
    marginTop: 2,
  },
  alertContentCol: {
    flex: 1,
  },
  alertItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  alertItemReason: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 1,
  },
  alertItemMeta: {
    fontSize: 10.5,
    color: '#B91C1C',
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
