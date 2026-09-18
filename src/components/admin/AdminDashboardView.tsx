import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

/* ============================================================================
 * BOTTOM SHEET MODAL COMPONENTS FOR ADMIN FILTERS
 * ============================================================================ */

interface AdminPtFilterSheetProps {
  visible: boolean;
  ptsList: Array<{ ptId: string; fullName: string }>;
  selectedPtId: string;
  onSelect: (ptId: string) => void;
  onClose: () => void;
}

function AdminPtFilterSheet({
  visible,
  ptsList,
  selectedPtId,
  onSelect,
  onClose,
}: AdminPtFilterSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPts = useMemo(() => {
    if (!searchQuery.trim()) return ptsList;
    const q = searchQuery.toLowerCase().trim();
    return ptsList.filter((p) => p.fullName.toLowerCase().includes(q));
  }, [ptsList, searchQuery]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people" size={18} color="#0284C7" />
              <Text style={styles.sheetTitle}>Chọn Huấn luyện viên (PT)</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.sheetCloseBtn, pressed && { opacity: 0.7 }]}
            >
              <Feather name="x" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.sheetSearchWrap}>
            <Feather name="search" size={14} color="#94A3B8" />
            <TextInput
              style={styles.sheetSearchInput}
              placeholder="Tìm tên HLV..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                <Feather name="x-circle" size={14} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.sheetScrollList} showsVerticalScrollIndicator={false}>
            {/* Option "Tất cả HLV" */}
            <Pressable
              style={({ pressed }) => [
                styles.sheetOptionItem,
                selectedPtId === 'ALL' && styles.sheetOptionItemActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => {
                onSelect('ALL');
                onClose();
              }}
            >
              <View style={styles.sheetOptionLeft}>
                <View style={[styles.avatarCircle, selectedPtId === 'ALL' && styles.avatarCircleActive]}>
                  <Ionicons name="people-outline" size={16} color={selectedPtId === 'ALL' ? '#0284C7' : '#64748B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.sheetOptionTitle,
                      selectedPtId === 'ALL' && styles.sheetOptionTitleActive,
                    ]}
                  >
                    Tất cả HLV
                  </Text>
                  <Text style={styles.sheetOptionSub}>Hiển thị dữ liệu toàn bộ hệ thống</Text>
                </View>
              </View>
              {selectedPtId === 'ALL' && <Feather name="check" size={18} color="#0284C7" />}
            </Pressable>

            {/* Individual PT Options */}
            {filteredPts.map((pt) => {
              const isSelected = selectedPtId === pt.ptId;
              const shortInitial = (pt.fullName || 'PT').slice(0, 2).toUpperCase();
              return (
                <Pressable
                  key={pt.ptId}
                  style={({ pressed }) => [
                    styles.sheetOptionItem,
                    isSelected && styles.sheetOptionItemActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    onSelect(pt.ptId);
                    onClose();
                  }}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View style={[styles.avatarCircle, isSelected && styles.avatarCircleActive]}>
                      <Text style={[styles.avatarInitialText, isSelected && { color: '#0284C7' }]}>
                        {shortInitial}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.sheetOptionTitle,
                          isSelected && styles.sheetOptionTitleActive,
                        ]}
                      >
                        {pt.fullName}
                      </Text>
                      <Text style={styles.sheetOptionSub}>Huấn luyện viên cá nhân</Text>
                    </View>
                  </View>
                  {isSelected && <Feather name="check" size={18} color="#0284C7" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface AdminStatusFilterSheetProps {
  visible: boolean;
  selectedStatus: string;
  totalCustomers: number;
  activeCount: number;
  leadCount: number;
  inactiveCount: number;
  onSelect: (status: string) => void;
  onClose: () => void;
}

function AdminStatusFilterSheet({
  visible,
  selectedStatus,
  totalCustomers,
  activeCount,
  leadCount,
  inactiveCount,
  onSelect,
  onClose,
}: AdminStatusFilterSheetProps) {
  const options = [
    {
      id: 'ALL',
      label: 'Tất cả trạng thái',
      subText: 'Hiển thị đầy đủ mọi danh mục',
      count: totalCustomers,
      dotColor: '#0284C7',
    },
    {
      id: 'ACTIVE',
      label: 'Đang tập',
      subText: 'Đang có gói tập / tập thường xuyên',
      count: activeCount,
      dotColor: '#10B981',
    },
    {
      id: 'LEAD',
      label: 'Tiềm năng',
      subText: 'Đã tư vấn / chưa chốt gói',
      count: leadCount,
      dotColor: '#F59E0B',
    },
    {
      id: 'INACTIVE',
      label: 'Tạm dừng',
      subText: 'Đã hết hạn hoặc tạm bảo lưu',
      count: inactiveCount,
      dotColor: '#64748B',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="funnel" size={16} color="#0284C7" />
              <Text style={styles.sheetTitle}>Trạng thái hội viên</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.sheetCloseBtn, pressed && { opacity: 0.7 }]}
            >
              <Feather name="x" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.sheetOptionsList}>
            {options.map((opt) => {
              const isSelected = selectedStatus === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.sheetOptionItem,
                    isSelected && styles.sheetOptionItemActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    onSelect(opt.id);
                    onClose();
                  }}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View style={[styles.sheetDotIndicator, { backgroundColor: opt.dotColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.sheetOptionTitle,
                          isSelected && styles.sheetOptionTitleActive,
                        ]}
                      >
                        {opt.label} ({opt.count})
                      </Text>
                      <Text style={styles.sheetOptionSub}>{opt.subText}</Text>
                    </View>
                  </View>
                  {isSelected && <Feather name="check" size={18} color="#0284C7" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface AdminQuickFeature {
  id: string;
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  route?: string;
}

const ADMIN_QUICK_FEATURES: AdminQuickFeature[] = [
  {
    id: 'pts',
    title: 'HLV',
    iconName: 'people-outline',
    route: '/(app)/customers',
  },
  {
    id: 'customers',
    title: 'Khách hàng',
    iconName: 'person-add-outline',
    route: '/(app)/admin/customers',
  },
  {
    id: 'packages',
    title: 'Gói tập',
    iconName: 'cube-outline',
  },
  {
    id: 'wallet',
    title: 'Ví credit',
    iconName: 'wallet-outline',
    route: '/(app)/wallet',
  },
  {
    id: 'knowledge',
    title: 'Kho tri thức',
    iconName: 'book-outline',
  },
  {
    id: 'settings',
    title: 'Cài đặt',
    iconName: 'settings-outline',
    route: '/(app)/profile',
  },
];

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

  // Bottom Sheets for Filter
  const [showPtSheet, setShowPtSheet] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);

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
  const pctRemaining = 100 - pctCompleted;
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

  const handleAdminFeaturePress = (id: string, route?: string) => {
    if (id === 'pts') {
      router.push({ pathname: '/(app)/admin/[section]', params: { section: 'pts' } });
    } else if (id === 'packages') {
      router.push({ pathname: '/(app)/admin/[section]', params: { section: 'packages' } });
    } else if (id === 'knowledge') {
      router.push({ pathname: '/(app)/admin/[section]', params: { section: 'knowledge' } });
    } else if (route) {
      router.push(route as any);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} />}
    >
      {/* 1. THẺ CHỈ SỐ TỔNG HỢP (QUICK STATS CARD) */}
      <View style={styles.quickStatsCard}>
        {/* HLV */}
        <Pressable
          onPress={() => router.push('/(app)/customers')}
          style={({ pressed }) => [
            styles.quickStatCol,
            pressed && styles.quickStatColPressed,
          ]}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="people" size={15} color="#0284C7" />
          </View>
          <View style={styles.statInfo}>
            <Text style={[styles.statValue, { color: '#0284C7' }]}>{totalPts}</Text>
            <Text style={styles.statLabel}>HLV</Text>
          </View>
        </Pressable>

        <View style={styles.statDivider} />

        {/* Khách hàng */}
        <Pressable
          onPress={() => router.push({ pathname: '/(app)/admin/[section]', params: { section: 'customers' } })}
          style={({ pressed }) => [
            styles.quickStatCol,
            pressed && styles.quickStatColPressed,
          ]}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="person-add" size={15} color="#16A34A" />
          </View>
          <View style={styles.statInfo}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{totalCustomers}</Text>
            <Text style={styles.statLabel}>Khách hàng</Text>
          </View>
        </Pressable>

        <View style={styles.statDivider} />

        {/* Cảnh báo */}
        <Pressable
          onPress={() => {
            if (openAlerts > 0) {
              setIsFilterExpanded(true);
            }
          }}
          style={({ pressed }) => [
            styles.quickStatCol,
            pressed && styles.quickStatColPressed,
          ]}
        >
          <View
            style={[
              styles.statIconWrap,
              { backgroundColor: openAlerts > 0 ? '#FEF2F2' : '#F4F8FB' },
            ]}
          >
            <Feather
              name={openAlerts > 0 ? 'alert-triangle' : 'shield'}
              size={15}
              color={openAlerts > 0 ? '#EF4444' : '#64748B'}
            />
          </View>
          <View style={styles.statInfo}>
            <Text
              style={[
                styles.statValue,
                openAlerts > 0 && { color: '#EF4444' },
              ]}
            >
              {openAlerts}
            </Text>
            <Text style={styles.statLabel}>Cảnh báo</Text>
          </View>
        </Pressable>
      </View>

      {/* 2. LƯỚI TÍNH NĂNG CHUYÊN SÂU GIỐNG MÀN HÌNH PT */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>CHỨC NĂNG QUẢN LÝ</Text>
        <Text style={styles.sectionMeta}>{ADMIN_QUICK_FEATURES.length} phân hệ</Text>
      </View>

      <View style={styles.featuresCard}>
        <View style={styles.featuresGrid}>
          {ADMIN_QUICK_FEATURES.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleAdminFeaturePress(item.id, item.route)}
              style={({ pressed }) => [
                styles.featureItem,
                pressed && styles.featureItemPressed,
              ]}
            >
              <View style={styles.featureIconWrap}>
                <Ionicons name={item.iconName} size={20} color="#0284C7" />
              </View>
              <Text style={styles.featureTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          ))}
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

          {/* Filter Selectors Row (PT & Customer Status) */}
          <View style={styles.filterSelectorsRow}>
            {/* PT Selector Button */}
            <Pressable
              style={({ pressed }) => [
                styles.filterSelectorBtn,
                selectedPtId !== 'ALL' && styles.filterSelectorBtnActive,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setShowPtSheet(true)}
            >
              <Ionicons
                name="people"
                size={14}
                color={selectedPtId !== 'ALL' ? '#0284C7' : '#64748B'}
              />
              <Text
                style={[
                  styles.filterSelectorBtnText,
                  selectedPtId !== 'ALL' && styles.filterSelectorBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedPtId === 'ALL'
                  ? 'Tất cả HLV'
                  : ptsList.find((p) => p.ptId === selectedPtId)?.fullName || 'HLV đã chọn'}
              </Text>
              <Feather
                name="chevron-down"
                size={14}
                color={selectedPtId !== 'ALL' ? '#0284C7' : '#94A3B8'}
              />
            </Pressable>

            {/* Status Selector Button */}
            <Pressable
              style={({ pressed }) => [
                styles.filterSelectorBtn,
                selectedStatus !== 'ALL' && styles.filterSelectorBtnActive,
                pressed && styles.btnPressed,
              ]}
              onPress={() => setShowStatusSheet(true)}
            >
              <Ionicons
                name="funnel"
                size={13}
                color={selectedStatus !== 'ALL' ? '#0284C7' : '#64748B'}
              />
              <Text
                style={[
                  styles.filterSelectorBtnText,
                  selectedStatus !== 'ALL' && styles.filterSelectorBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedStatus === 'ALL'
                  ? 'Tất cả trạng thái'
                  : selectedStatus === 'ACTIVE'
                  ? 'Đang tập'
                  : selectedStatus === 'LEAD'
                  ? 'Tiềm năng'
                  : 'Tạm dừng'}
              </Text>
              <Feather
                name="chevron-down"
                size={14}
                color={selectedStatus !== 'ALL' ? '#0284C7' : '#94A3B8'}
              />
            </Pressable>
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

      {/* 4. VISUAL CHARTS SECTION WITH ANIMATION & PT FILTER BUTTON */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.sectionHeaderTitle}>HOẠT ĐỘNG</Text>
        </View>

        {/* Nút Tìm kiếm / Lọc HLV đặt ở đây */}
        <Pressable
          style={({ pressed }) => [
            styles.ptSearchFilterBtn,
            selectedPtId !== 'ALL' && styles.ptSearchFilterBtnActive,
            pressed && styles.btnPressed,
          ]}
          onPress={() => setShowPtSheet(true)}
        >
          <Feather
            name="search"
            size={13}
            color={selectedPtId !== 'ALL' ? '#0284C7' : '#475569'}
          />
          <Text
            style={[
              styles.ptSearchFilterBtnText,
              selectedPtId !== 'ALL' && styles.ptSearchFilterBtnTextActive,
            ]}
            numberOfLines={1}
          >
            {selectedPtId === 'ALL'
              ? 'Lọc HLV'
              : ptsList.find((p) => p.ptId === selectedPtId)?.fullName || 'HLV đã chọn'}
          </Text>
          <Feather
            name="chevron-down"
            size={13}
            color={selectedPtId !== 'ALL' ? '#0284C7' : '#94A3B8'}
          />
        </Pressable>
      </View>

      {/* Banner thông báo nếu đang có HLV được chọn */}
      {selectedPtId !== 'ALL' && (
        <View style={styles.activePtBanner}>
          <Ionicons name="person" size={13} color="#0284C7" />
          <Text style={styles.activePtBannerText} numberOfLines={1}>
            Đang lọc dữ liệu theo HLV: {ptsList.find((p) => p.ptId === selectedPtId)?.fullName || selectedPtId}
          </Text>
          <Pressable onPress={() => setSelectedPtId('ALL')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color="#0284C7" />
          </Pressable>
        </View>
      )}

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
                <Text style={styles.breakdownLabel}>Đang tập</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: '#15803D' }]}>
                {activeCount} <Text style={styles.breakdownSub}>({pctActive}%)</Text>
              </Text>
            </View>

            {/* Tiềm năng */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.dotIndicator, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.breakdownLabel}>Tiềm năng</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: '#B45309' }]}>
                {leadCount} <Text style={styles.breakdownSub}>({pctLead}%)</Text>
              </Text>
            </View>

            {/* Tạm dừng */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.dotIndicator, { backgroundColor: '#64748B' }]} />
                <Text style={styles.breakdownLabel}>Tạm dừng</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: '#475569' }]}>
                {inactiveCount} <Text style={styles.breakdownSub}>({pctInactive}%)</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* CARD: TIẾN ĐỘ THỰC HIỆN BUỔI TẬP (GIỐNG ĐÚNG MẪU ẢNH 2) */}
      <View style={styles.cleanCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionProgressTitle}>Tiến độ Thực hiện Buổi tập</Text>
          </View>
          <View style={styles.sessionBadgePill}>
            <Text style={styles.sessionBadgePillText}>{pctCompleted}% Hoàn thành</Text>
          </View>
        </View>

        {/* Track & Fill Bar */}
        <View style={styles.sessionProgressBarTrack}>
          <View
            style={[
              styles.sessionProgressBarFill,
              { width: `${Math.min(100, Math.max(0, pctCompleted))}%` },
            ]}
          />
        </View>

        {/* 3 Columns Sub-cards Row */}
        <View style={styles.sessionMetricsRow}>
          {/* Card 1: Tổng số buổi */}
          <View style={styles.sessionMetricCardTotal}>
            <Text style={styles.sessionMetricLabel}>Tổng số buổi</Text>
            <Text style={styles.sessionMetricValTotal}>{totalSessions}</Text>
            <Text style={styles.sessionMetricSub}>Toàn hệ thống</Text>
          </View>

          {/* Card 2: Đã tập luyện */}
          <View style={styles.sessionMetricCardDone}>
            <Text style={[styles.sessionMetricLabel, { color: '#0369A1' }]}>Đã tập luyện</Text>
            <Text style={styles.sessionMetricValDone}>{completedSessions}</Text>
            <Text style={[styles.sessionMetricSub, { color: '#0284C7' }]}>{pctCompleted}% hoàn tất</Text>
          </View>

          {/* Card 3: Buổi còn lại */}
          <View style={styles.sessionMetricCardRemaining}>
            <Text style={[styles.sessionMetricLabel, { color: '#15803D' }]}>Buổi còn lại</Text>
            <Text style={styles.sessionMetricValRemaining}>{remainingSessions}</Text>
            <Text style={[styles.sessionMetricSub, { color: '#16A34A' }]}>{pctRemaining}% chưa tập</Text>
          </View>
        </View>
      </View>

      {/* 5. PT WORKLOAD & LEADERBOARD SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>HIỆU SUẤT ĐỘI NGŨ HLV</Text>
      </View>

      {/* Bar Chart & PT Workload Card with Animation */}
      <View style={styles.cleanCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Phân bổ học viên</Text>
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

      {/* Admin Filter Bottom Sheets */}
      <AdminPtFilterSheet
        visible={showPtSheet}
        ptsList={ptsList}
        selectedPtId={selectedPtId}
        onSelect={(ptId) => setSelectedPtId(ptId)}
        onClose={() => setShowPtSheet(false)}
      />

      <AdminStatusFilterSheet
        visible={showStatusSheet}
        selectedStatus={selectedStatus}
        totalCustomers={totalCustomers}
        activeCount={activeCount}
        leadCount={leadCount}
        inactiveCount={inactiveCount}
        onSelect={(st) => setSelectedStatus(st)}
        onClose={() => setShowStatusSheet(false)}
      />

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

  /* Quick Stats Summary Card (PT Style) */
  quickStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickStatCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  quickStatColPressed: {
    opacity: 0.7,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 12,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.6,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Features Grid Card (PT Style) */
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  featureItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  featureTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    maxWidth: '92%',
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

  /* PT Search/Filter Button in Section Header */
  ptSearchFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ptSearchFilterBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  ptSearchFilterBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    maxWidth: 110,
  },
  ptSearchFilterBtnTextActive: {
    color: '#0284C7',
    fontWeight: '700',
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
  filterSelectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    minHeight: 44,
  },
  filterSelectorBtnActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  filterSelectorBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  filterSelectorBtnTextActive: {
    color: '#0284C7',
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
    minHeight: 38,
  },
  dateChipText: {
    fontSize: 11.5,
    color: '#334155',
  },

  /* Bottom Sheet Overlay & Modal Styles */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
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
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
    gap: 8,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  sheetScrollList: {
    maxHeight: 320,
  },
  sheetOptionsList: {
    gap: 8,
  },
  sheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    marginBottom: 6,
  },
  sheetOptionItemActive: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  sheetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleActive: {
    backgroundColor: '#E0F2FE',
  },
  avatarInitialText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  sheetOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  sheetOptionTitleActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  sheetOptionSub: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94A3B8',
    marginTop: 1,
  },
  sheetDotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
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

  /* Tiến độ Thực hiện Buổi tập Card (Match Image 2) */
  sessionProgressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  sessionProgressSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  sessionBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  sessionBadgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  sessionProgressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 14,
  },
  sessionProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  sessionMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionMetricCardTotal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
  },
  sessionMetricCardDone: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 10,
  },
  sessionMetricCardRemaining: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 10,
  },
  sessionMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  sessionMetricValTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sessionMetricValDone: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0284C7',
    marginBottom: 4,
  },
  sessionMetricValRemaining: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16A34A',
    marginBottom: 4,
  },
  sessionMetricSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
