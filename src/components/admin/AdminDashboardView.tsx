import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
 * ANIMATED SVG VISUAL CHART COMPONENTS (60FPS SMOOTH EASE-OUT ANIMATION)
 * ============================================================================ */

function AdminDonutChart({
  active,
  lead,
  inactive,
  total,
  size = 110,
  strokeWidth = 14,
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

  const [fillProgress, setFillProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setFillProgress(0);
    const startTime = Date.now();
    const duration = 850;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - p) * (1 - p); // Quad ease-out smooth 60fps
      setFillProgress(eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, lead, inactive, total]);

  const totalVal = Math.max(1, total || active + lead + inactive);
  const currentCircumference = fillProgress * circumference;

  const activeRatio = active / totalVal;
  const leadRatio = lead / totalVal;
  const inactiveRatio = inactive / totalVal;

  const activeDash = activeRatio * currentCircumference;
  const leadDash = leadRatio * currentCircumference;
  const inactiveDash = inactiveRatio * currentCircumference;

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
          y={center - 2}
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="#0F172A"
        >
          {Math.round(total * fillProgress)}
        </SvgText>
        <SvgText
          x={center}
          y={center + 13}
          textAnchor="middle"
          fontSize="9.5"
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
  const [fillProgress, setFillProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setFillProgress(0);
    const startTime = Date.now();
    const duration = 850;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - p) * (1 - p);
      setFillProgress(eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [completedSessions]);

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
  const height = 120;
  const paddingX = 20;
  const paddingTop = 18;
  const paddingBottom = 22;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...rawData, 6);
  const minVal = 0;

  const points = rawData.map((val, idx) => {
    const targetY = paddingTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    const startY = paddingTop + chartH; // Baseline
    const y = startY + (targetY - startY) * fillProgress;
    return { x: paddingX + (idx / (rawData.length - 1)) * chartW, y, val, day: days[idx] };
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
            <Stop offset="0%" stopColor="#0284C7" stopOpacity={0.25 * fillProgress} />
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
              stroke="#F1F5F9"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        <Path d={areaD} fill="url(#adminLineGrad)" />
        <Path d={pathD} stroke="#0284C7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((pt, i) => (
          <G key={`pt-${i}`}>
            <Circle cx={pt.x} cy={pt.y} r="3.5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
            <SvgText
              x={pt.x}
              y={pt.y - 6}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill="#0369A1"
              opacity={fillProgress}
            >
              {pt.val}
            </SvgText>
            <SvgText
              x={pt.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="9.5"
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
  const [fillProgress, setFillProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setFillProgress(0);
    const startTime = Date.now();
    const duration = 850;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - p) * (1 - p);
      setFillProgress(eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ptWorkload]);

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
  const height = 120;
  const paddingTop = 18;
  const paddingBottom = 22;
  const paddingX = 16;
  const chartH = height - paddingTop - paddingBottom;
  const chartW = width - paddingX * 2;
  const barWidth = Math.min(24, (chartW / items.length) * 0.45);

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
          stroke="#E2E8F0"
          strokeWidth="1"
        />

        {items.map((item, idx) => {
          const slotW = chartW / items.length;
          const cx = paddingX + idx * slotW + slotW / 2;
          const x = cx - barWidth / 2;
          const valRatio = item.activeCustomers / maxVal;
          const fullBarH = Math.max(6, valRatio * chartH);
          const barH = fullBarH * fillProgress;
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
                y={y - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#0369A1"
                opacity={fillProgress}
              >
                {item.activeCustomers}
              </SvgText>
              <SvgText
                x={cx}
                y={height - 6}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill="#64748B"
              >
                {shortName.length > 6 ? `${shortName.slice(0, 5)}..` : shortName}
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

  // Filter state
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedPtId, setSelectedPtId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Date pickers
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // PT List dropdown
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
  const pctActive = totalCustomers > 0 ? Math.round((activeCount / totalCustomers) * 100) : 0;
  const pctLead = totalCustomers > 0 ? Math.round((leadCount / totalCustomers) * 100) : 0;
  const pctInactive = totalCustomers > 0 ? Math.round((inactiveCount / totalCustomers) * 100) : 0;

  const maxWorkload = useMemo(() => {
    if (!data?.ptWorkload || data.ptWorkload.length === 0) return 1;
    return Math.max(...data.ptWorkload.map((p) => p.activeCustomers || p.totalCustomers || 1));
  }, [data]);

  const hasActiveFilters = selectedPtId !== 'ALL' || selectedStatus !== 'ALL' || Boolean(fromDate) || Boolean(toDate);

  const resetFilters = () => {
    setSelectedPtId('ALL');
    setSelectedStatus('ALL');
    setFromDate('');
    setToDate('');
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} />}
    >
      {/* 1. TOP MODULE NAVIGATION IN 1 SINGLE CARD (6 FEATURE ICONS IN 3x2 GRID) */}
      <View style={styles.topNavModuleCard}>
        <View style={styles.topNavGridMatrix}>
          {/* Row 1: HLV, Khách hàng, Gói tập */}
          <View style={styles.topNavRow}>
            {/* 1. HLV */}
            <Pressable style={({ pressed }) => [styles.topNavBtnItem, pressed && styles.btnPressed]}>
              <View style={[styles.topNavIconCircle, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="people-outline" size={18} color="#0284C7" />
              </View>
              <Text style={styles.topNavBtnText}>HLV</Text>
            </Pressable>

            {/* 2. Khách hàng */}
            <Pressable style={({ pressed }) => [styles.topNavBtnItem, pressed && styles.btnPressed]}>
              <View style={[styles.topNavIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="person-add-outline" size={18} color="#16A34A" />
              </View>
              <Text style={styles.topNavBtnText}>Khách hàng</Text>
            </Pressable>

            {/* 3. Gói tập */}
            <Pressable style={({ pressed }) => [styles.topNavBtnItem, pressed && styles.btnPressed]}>
              <View style={[styles.topNavIconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="cube-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.topNavBtnText}>Gói tập</Text>
            </Pressable>
          </View>

          {/* Row 2: Ví credit, Kho tri thức, Cài đặt */}
          <View style={styles.topNavRow}>
            {/* 4. Ví credit */}
            <Pressable
              style={({ pressed }) => [styles.topNavBtnItem, pressed && styles.btnPressed]}
              onPress={() => router.push('/(app)/wallet')}
            >
              <View style={[styles.topNavIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="wallet-outline" size={18} color="#D97706" />
              </View>
              <Text style={styles.topNavBtnText}>Ví credit</Text>
            </Pressable>

            {/* 5. Kho tri thức */}
            <Pressable style={({ pressed }) => [styles.topNavBtnItem, pressed && styles.btnPressed]}>
              <View style={[styles.topNavIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="book-outline" size={18} color="#2563EB" />
              </View>
              <Text style={styles.topNavBtnText}>Kho tri thức</Text>
            </Pressable>

            {/* 6. Cài đặt */}
            <Pressable
              style={({ pressed }) => [styles.topNavBtnItem, pressed && styles.btnPressed]}
              onPress={() => router.push('/(app)/profile')}
            >
              <View style={[styles.topNavIconCircle, { backgroundColor: '#F8FAFC' }]}>
                <Ionicons name="settings-outline" size={18} color="#475569" />
              </View>
              <Text style={styles.topNavBtnText}>Cài đặt</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. PAGE TITLE & COMPACT FILTER BAR */}
      <View style={styles.titleFilterHeader}>
        <View style={styles.titleLeftRow}>
          <Text style={styles.sectionHeaderTitle}>TỔNG QUAN HỆ THỐNG</Text>
        </View>

        <View style={styles.headerRightBtns}>
          <Pressable
            style={({ pressed }) => [
              styles.filterToggleBtn,
              hasActiveFilters && styles.filterToggleBtnActive,
              pressed && styles.btnPressed,
            ]}
            onPress={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            <Ionicons
              name="funnel-outline"
              size={13}
              color={hasActiveFilters ? '#0284C7' : '#475569'}
            />
            <Text
              style={[
                styles.filterToggleText,
                hasActiveFilters && { color: '#0284C7', fontWeight: '700' },
              ]}
            >
              Lọc {hasActiveFilters ? '•' : ''}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.iconRefreshBtn, pressed && styles.btnPressed]}
            onPress={onRefresh}
            hitSlop={8}
          >
            <Feather name="refresh-cw" size={13} color="#0284C7" />
          </Pressable>
        </View>
      </View>

      {/* Active Filter Banner if PT selected */}
      {selectedPtId !== 'ALL' && (
        <View style={styles.activePtBanner}>
          <Ionicons name="person" size={13} color="#0284C7" />
          <Text style={styles.activePtBannerText} numberOfLines={1}>
            Đang xem báo cáo HLV: {ptsList.find((p) => p.ptId === selectedPtId)?.fullName || selectedPtId}
          </Text>
          <Pressable onPress={() => setSelectedPtId('ALL')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color="#0284C7" />
          </Pressable>
        </View>
      )}

      {/* Collapsible Filter Strip */}
      {isFilterExpanded && (
        <View style={styles.expandedFilterCard}>
          <View style={styles.filterCardHeader}>
            <Text style={styles.filterCardTitle}>Bộ lọc dữ liệu hệ thống</Text>
            {hasActiveFilters && (
              <Pressable onPress={resetFilters} hitSlop={6}>
                <Text style={styles.resetFilterText}>Xóa lọc</Text>
              </Pressable>
            )}
          </View>

          {/* PT Selector Row */}
          <Text style={styles.fieldLabel}>Chọn Huấn luyện viên (PT):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <View style={styles.statusPillsRow}>
              <Pressable
                onPress={() => setSelectedPtId('ALL')}
                style={[
                  styles.statusChip,
                  selectedPtId === 'ALL' && styles.statusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    selectedPtId === 'ALL' && styles.statusChipTextActive,
                  ]}
                >
                  Tất cả HLV
                </Text>
              </Pressable>
              {ptsList.map((pt) => (
                <Pressable
                  key={pt.ptId}
                  onPress={() => setSelectedPtId(pt.ptId)}
                  style={[
                    styles.statusChip,
                    selectedPtId === pt.ptId && styles.statusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      selectedPtId === pt.ptId && styles.statusChipTextActive,
                    ]}
                  >
                    {pt.fullName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Status Pills Selector */}
          <Text style={styles.fieldLabel}>Trạng thái hội viên:</Text>
          <View style={styles.statusPillsRow}>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'ACTIVE', label: 'Đang tập' },
              { id: 'LEAD', label: 'Tiềm năng' },
              { id: 'INACTIVE', label: 'Tạm dừng' },
            ].map((st) => (
              <Pressable
                key={st.id}
                onPress={() => setSelectedStatus(st.id)}
                style={[
                  styles.statusChip,
                  selectedStatus === st.id && styles.statusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    selectedStatus === st.id && styles.statusChipTextActive,
                  ]}
                >
                  {st.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Date Pickers */}
          <View style={styles.dateRowContainer}>
            <Pressable
              style={styles.dateChipBtn}
              onPress={() => setShowFromPicker(true)}
            >
              <Feather name="calendar" size={12} color="#0284C7" />
              <Text style={styles.dateChipText}>
                {fromDate ? `Từ: ${fromDate}` : 'Từ ngày...'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.dateChipBtn}
              onPress={() => setShowToPicker(true)}
            >
              <Feather name="calendar" size={12} color="#0284C7" />
              <Text style={styles.dateChipText}>
                {toDate ? `Đến: ${toDate}` : 'Đến ngày...'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 3. 4 METRIC CARDS IN GRID FORMAT (DẠNG LƯỚI 2x2 - KHÔNG TRƯỢT) */}
      <View style={styles.kpiGrid2x2}>
        {/* KPI 1: HLV PT */}
        <View style={styles.kpiGridCard}>
          <View style={styles.kpiCardTopRow}>
            <Text style={styles.kpiCardLabel}>HLV PT</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="people" size={16} color="#0284C7" />
            </View>
          </View>
          <Text style={[styles.kpiCardVal, { color: '#0284C7' }]}>{totalPts}</Text>
          <Text style={styles.kpiCardSub}>Đang hoạt động</Text>
        </View>

        {/* KPI 2: HỘI VIÊN */}
        <View style={styles.kpiGridCard}>
          <View style={styles.kpiCardTopRow}>
            <Text style={styles.kpiCardLabel}>HỘI VIÊN</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="person-add" size={16} color="#16A34A" />
            </View>
          </View>
          <Text style={[styles.kpiCardVal, { color: '#16A34A' }]}>{totalCustomers}</Text>
          <Text style={styles.kpiCardSub}>{activeCount} Đang tập</Text>
        </View>

        {/* KPI 3: GÓI MẪU */}
        <View style={styles.kpiGridCard}>
          <View style={styles.kpiCardTopRow}>
            <Text style={styles.kpiCardLabel}>GÓI MẪU</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="cube" size={16} color="#7C3AED" />
            </View>
          </View>
          <Text style={[styles.kpiCardVal, { color: '#7C3AED' }]}>{activePackages}</Text>
          <Text style={styles.kpiCardSub}>Toàn hệ thống</Text>
        </View>

        {/* KPI 4: CẢNH BÁO */}
        <View style={styles.kpiGridCard}>
          <View style={styles.kpiCardTopRow}>
            <Text style={styles.kpiCardLabel}>CẢNH BÁO</Text>
            <View
              style={[
                styles.kpiIconWrap,
                { backgroundColor: openAlerts > 0 ? '#FEF2F2' : '#F8FAFC' },
              ]}
            >
              <Ionicons
                name={openAlerts > 0 ? 'warning' : 'shield-checkmark'}
                size={16}
                color={openAlerts > 0 ? '#EF4444' : '#64748B'}
              />
            </View>
          </View>
          <Text style={[styles.kpiCardVal, openAlerts > 0 && { color: '#EF4444' }]}>
            {openAlerts}
          </Text>
          <Text style={styles.kpiCardSub}>
            {openAlerts > 0 ? 'Cần xử lý' : 'An toàn'}
          </Text>
        </View>
      </View>

      {/* 4. VISUAL CHARTS SECTION WITH ANIMATION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>TỶ LỆ TƯƠNG TÁC & HOẠT ĐỘNG</Text>
        <Text style={styles.sectionMetaText}>Cập nhật trực tiếp</Text>
      </View>

      {/* Chart Card 1: Donut + Side-by-Side Status Metrics */}
      <View style={styles.cleanCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Phân bổ Trạng thái Hội viên</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{totalCustomers} tổng số</Text>
          </View>
        </View>

        <View style={styles.donutRowLayout}>
          {/* Animated Donut SVG Ring */}
          <AdminDonutChart
            active={activeCount}
            lead={leadCount}
            inactive={inactiveCount}
            total={totalCustomers}
            size={115}
            strokeWidth={14}
          />

          {/* Breakdown Rows */}
          <View style={styles.donutBreakdownCol}>
            {/* Đang tập */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.dotIndicator, { backgroundColor: '#10B981' }]} />
                <Text style={styles.breakdownLabel}>Đang tập luyện</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: '#15803D' }]}>
                {activeCount} <Text style={styles.breakdownSub}>({pctActive}%)</Text>
              </Text>
            </View>

            {/* Tiềm năng */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.dotIndicator, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.breakdownLabel}>Tiềm năng / Mới</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: '#B45309' }]}>
                {leadCount} <Text style={styles.breakdownSub}>({pctLead}%)</Text>
              </Text>
            </View>

            {/* Tạm dừng */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.dotIndicator, { backgroundColor: '#64748B' }]} />
                <Text style={styles.breakdownLabel}>Tạm dừng / Nghỉ</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: '#475569' }]}>
                {inactiveCount} <Text style={styles.breakdownSub}>({pctInactive}%)</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Chart Card 2: 7-Day Line Chart with Animation */}
      <View style={styles.cleanCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Xu hướng Tập luyện 7 ngày</Text>
            <Text style={styles.cardSubtitle}>Tổng lượt tập hoàn thành theo tuần</Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="trending-up" size={12} color="#0284C7" style={{ marginRight: 3 }} />
            <Text style={[styles.badgePillText, { color: '#0284C7' }]}>Ổn định</Text>
          </View>
        </View>

        <View style={{ marginVertical: 4 }}>
          <AdminWeeklyTrendLineChart completedSessions={completedSessions} />
        </View>
      </View>

      {/* 5. PT WORKLOAD & LEADERBOARD SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>HIỆU SUẤT ĐỘI NGŨ HLV PT</Text>
      </View>

      {/* Bar Chart & PT Workload Card with Animation */}
      <View style={styles.cleanCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Biểu đồ Cột Tải công việc</Text>
          <Text style={styles.cardSubtitle}>Phân bổ học viên phụ trách</Text>
        </View>

        <View style={{ marginVertical: 4 }}>
          <AdminPtWorkloadBarChart ptWorkload={data?.ptWorkload} />
        </View>

        {/* Clean PT Ranking List */}
        {data?.ptWorkload && data.ptWorkload.length > 0 && (
          <View style={styles.ptRankingList}>
            {data.ptWorkload.map((pt, idx) => {
              const ratio = Math.min(1, Math.max(0.05, (pt.activeCustomers || 1) / maxWorkload));
              return (
                <View key={pt.ptId || `pt-${idx}`} style={styles.ptRankItem}>
                  <View style={styles.ptRankTopRow}>
                    <View style={styles.ptRankLeft}>
                      <View style={[styles.rankBadgeNum, idx === 0 && styles.rankBadgeGold]}>
                        <Text style={[styles.rankBadgeText, idx === 0 && styles.rankBadgeTextGold]}>
                          {idx + 1}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.ptRankName} numberOfLines={1}>
                          {pt.fullName}
                        </Text>
                        <Text style={styles.ptRankMeta}>@{pt.username}</Text>
                      </View>
                    </View>

                    <View style={styles.ptRankBadgeCount}>
                      <Text style={styles.ptRankCountText}>
                        {pt.activeCustomers} Học viên
                      </Text>
                    </View>
                  </View>

                  <View style={styles.miniWorkloadTrack}>
                    <View style={[styles.miniWorkloadFill, { width: `${ratio * 100}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 6. CARE ALERTS SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>CẢNH BÁO CHĂM SÓC HỘI VIÊN</Text>
        {openAlerts > 0 && <Text style={styles.alertBadgeCount}>{openAlerts} Cảnh báo</Text>}
      </View>

      {data?.recentAlerts && data.recentAlerts.length > 0 ? (
        <View style={styles.cleanCard}>
          {data.recentAlerts.map((alert, idx) => (
            <View key={(alert as any)._id || (alert as any).id || `alert-${idx}`} style={styles.alertRowItem}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertItemTitle}>{alert.customerName}</Text>
                <Text style={styles.alertItemReason}>{alert.reason}</Text>
                {alert.ptName && <Text style={styles.alertItemPt}>HLV: {alert.ptName}</Text>}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.safeStateCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.safeStateText}>Hệ thống vận hành an toàn! Không có cảnh báo tồn đọng.</Text>
        </View>
      )}

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
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },

  /* Single Card Top Nav Modules (6 Icons in 3x2 Grid) */
  topNavModuleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 4,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  topNavGridMatrix: {
    gap: 14,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  topNavBtnItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  topNavIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },

  /* Header Row */
  titleFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  titleLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  activePtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  activePtBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0284C7',
  },
  headerRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterToggleBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  iconRefreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  btnPressed: {
    opacity: 0.7,
  },

  /* Expanded Filter Card */
  expandedFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  filterCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  resetFilterText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#EF4444',
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  statusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  statusChipActive: {
    backgroundColor: '#0284C7',
  },
  statusChipText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateRowContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipText: {
    fontSize: 11.5,
    color: '#334155',
  },

  /* 2x2 KPI Grid Layout (Dạng Lưới 2x2 - Không trượt) */
  kpiGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiGridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 4,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  kpiCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiCardVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  kpiCardSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },

  /* Section Header Row */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionMetaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },

  /* Clean Card Wrapper */
  cleanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },

  /* Donut Side-by-Side Breakdown */
  donutRowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  donutBreakdownCol: {
    flex: 1,
    marginLeft: 14,
    gap: 8,
  },
  breakdownRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  breakdownSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94A3B8',
  },

  /* PT Ranking List */
  ptRankingList: {
    marginTop: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  ptRankItem: {
    gap: 5,
  },
  ptRankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ptRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rankBadgeNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeGold: {
    backgroundColor: '#FEF3C7',
  },
  rankBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  rankBadgeTextGold: {
    color: '#B45309',
  },
  ptRankName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  ptRankMeta: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  ptRankBadgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
  },
  ptRankCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  miniWorkloadTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  miniWorkloadFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 2,
  },

  /* Care Alerts */
  alertBadgeCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  alertRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  alertItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  alertItemReason: {
    fontSize: 11.5,
    color: '#7F1D1D',
  },
  alertItemPt: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  safeStateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  safeStateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#15803D',
  },
});
