import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { asRecord, readNumber, readText, formatDate } from '@/services/journey';
import { recordId } from '@/services/workouts';
import { colors, typography } from '@/theme';
import type { JsonRecord } from '@/types/domain';
import { Button, Field, Notice } from '../workouts/Controls';

export function ProgressDashboard({
  items,
  onSelect,
  recordOnly = false,
}: {
  items: JsonRecord[];
  recordOnly?: boolean;
  onSelect: (id: string, log: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = items.filter((item) => {
    const c = asRecord(item.customer);
    const searchString = `${readText(c, ['fullName'])} ${readText(c, ['phone'])}`.toLocaleLowerCase('vi');
    return searchString.includes(search.trim().toLocaleLowerCase('vi'));
  });

  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  const totalSessions = items.reduce((sum, item) => sum + (readNumber(item, ['sessionCount']) || 0), 0);
  const rates = items
    .map((item) => readNumber(asRecord(asRecord(item.analytics).attendance), ['rate']))
    .filter((n): n is number => n !== null);
  const avgRate = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) : '0';

  return (
    <View style={styles.container}>
      {/* 3-Column Athletic Stats Counter */}
      <View style={styles.statsBanner}>
        <View style={styles.statColumn}>
          <Text style={styles.statNumber}>{items.length}</Text>
          <Text style={styles.statLabel}>Học viên</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statColumn}>
          <Text style={styles.statNumber}>{totalSessions}</Text>
          <Text style={styles.statLabel}>Buổi đã tập</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statColumn}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{avgRate}%</Text>
          <Text style={styles.statLabel}>Tham gia TB</Text>
        </View>
      </View>

      {/* Search Input */}
      <Field
        label="Tìm kiếm học viên"
        placeholder="Nhập tên hoặc số điện thoại..."
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      {/* Customer List */}
      {!filtered.length ? (
        <Notice text="Không có học viên nào phù hợp với từ khóa tìm kiếm." />
      ) : (
        filtered.slice((current - 1) * 10, current * 10).map((item) => {
          const c = asRecord(item.customer);
          const latest = asRecord(item.latestMeasurement);
          const id = recordId(c);
          const name = readText(c, ['fullName'], 'Học viên');
          const phone = readText(c, ['phone']);
          const sessionCount = readNumber(item, ['sessionCount']) ?? 0;
          const weight = readNumber(latest, ['weight']);
          const initials = name
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .slice(-2)
            .join('')
            .toUpperCase() || 'HV';

          return (
            <View key={id} style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.customerMeta}>
                  <Text numberOfLines={1} style={styles.customerName}>{name}</Text>
                  {phone ? (
                    <Text numberOfLines={1} style={styles.customerPhone}>{phone}</Text>
                  ) : null}
                </View>
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionBadgeText}>{sessionCount} buổi</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Cân nặng gần nhất</Text>
                  <Text style={styles.metricItemValue}>
                    {weight !== null ? `${weight} kg` : '—'}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Buổi tập gần nhất</Text>
                  <Text style={styles.metricItemValue}>
                    {item.lastSessionAt ? formatDate(String(item.lastSessionAt)) : 'Chưa có'}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                {!recordOnly && <View style={styles.actionButtonHalf}>
                  <Button
                    secondary
                    icon="trending-up"
                    label="Tiến độ"
                    onPress={() => onSelect(id, false)}
                  />
                </View>}
                <View style={recordOnly ? { flex: 1 } : styles.actionButtonHalf}>
                  <Button
                    icon="plus"
                    label="Ghi buổi tập"
                    onPress={() => onSelect(id, true)}
                  />
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Pagination */}
      {pages > 1 && (
        <View style={styles.paginationRow}>
          <Button
            secondary
            label="Trang trước"
            disabled={current === 1}
            onPress={() => setPage(current - 1)}
          />
          <Text style={styles.paginationText}>Trang {current} / {pages}</Text>
          <Button
            secondary
            label="Trang sau"
            disabled={current === pages}
            onPress={() => setPage(current + 1)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statNumber: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSoft,
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  customerMeta: {
    flex: 1,
    gap: 2,
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
  },
  customerPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sessionBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  metricItem: {
    gap: 2,
  },
  metricItemLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.textMuted,
  },
  metricItemValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonHalf: {
    flex: 1,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  paginationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
