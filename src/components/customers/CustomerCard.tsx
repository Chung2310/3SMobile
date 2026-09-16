import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, spacing } from '@/theme';
import {
  CustomerListItem,
  getBadgeColor,
  getCategoryText,
} from './types';

interface CustomerCardProps {
  item: CustomerListItem;
  onPress: (item: CustomerListItem) => void;
  onManagePackages: (item: CustomerListItem) => void;
  onGoals?: (item: CustomerListItem) => void;
  onEdit: (item: CustomerListItem) => void;
  onDelete: (item: CustomerListItem) => void;
}

export function CustomerCard({
  item,
  onPress,
  onManagePackages,
  onGoals,
  onEdit,
  onDelete,
}: CustomerCardProps) {
  const badgeColor = getBadgeColor(item.progressCategory);
  const categoryText = getCategoryText(item.progressCategory);

  return (
    <View style={styles.customerCard}>
      {/* TOP ROW: Avatar + Tên + Badge trạng thái + Meta */}
      <Pressable
        style={({ pressed }) => [
          styles.cardMainRow,
          pressed && { opacity: 0.72, transform: [{ scale: 0.99 }] },
        ]}
        onPress={() => onPress(item)}
      >
        <View style={styles.avatarMini}>
          <Text style={styles.avatarMiniText}>
            {item.fullName.trim().charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.customerInfoWrap}>
          <View style={styles.nameRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.fullName}
            </Text>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: `${badgeColor}18` },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: badgeColor },
                ]}
              >
                {categoryText}
              </Text>
            </View>
          </View>

          {/* SĐT & Số phiếu InBody gọn gàng trên 1 hàng */}
          <View style={styles.metaRow}>
            {item.phone ? (
              <Text style={styles.phoneTextCompact}>{item.phone}</Text>
            ) : null}
            {item.phone ? <Text style={styles.metaDot}>•</Text> : null}
            <Text style={styles.inbodyCountText}>
              {item.measurementCount || 0} phiếu InBody
            </Text>
          </View>

          {/* Mục tiêu rút gọn 1 dòng */}
          {item.initialGoal ? (
            <Text style={styles.goalTextCompact} numberOfLines={1}>
              Mục tiêu: {item.initialGoal}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* BOTTOM ROW: 4 NÚT THAO TÁC (GÓI PT -> HỒ SƠ -> SỬA -> XÓA) */}
      <View style={styles.cardActionsCompact}>
        {/* 1. Gói PT */}
        <Pressable
          style={({ pressed }) => [
            styles.ptPackageBtn,
            pressed && styles.ptPackageBtnPressed,
          ]}
          onPress={() => onManagePackages(item)}
          hitSlop={4}
          accessibilityLabel="Quản lý gói PT"
        >
          <Feather name="package" size={13} color="#7C3AED" />
          <Text style={styles.ptPackageBtnText}>Gói PT</Text>
        </Pressable>

        <View style={styles.actionDivider} />

        {/* 2. Mục tiêu (Icon target) */}
        {onGoals && (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.compactActionBtn,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={() => onGoals(item)}
              hitSlop={8}
              accessibilityLabel="Mục tiêu của khách hàng"
            >
              <Feather name="target" size={16} color="#0284C7" />
            </Pressable>

            <View style={styles.actionDivider} />
          </>
        )}

        {/* 3. Hồ sơ (Con mắt) */}
        <Pressable
          style={({ pressed }) => [
            styles.compactActionBtn,
            pressed && styles.actionBtnPressed,
          ]}
          onPress={() => onPress(item)}
          hitSlop={8}
          accessibilityLabel="Xem chi tiết hồ sơ"
        >
          <Feather name="eye" size={16} color="#00C2FF" />
        </Pressable>

        <View style={styles.actionDivider} />

        {/* 3. Sửa */}
        <Pressable
          style={({ pressed }) => [
            styles.compactActionBtn,
            pressed && styles.actionBtnPressed,
          ]}
          onPress={() => onEdit(item)}
          hitSlop={8}
          accessibilityLabel="Chỉnh sửa thông tin"
        >
          <Feather name="edit-2" size={15} color="#475569" />
        </Pressable>

        <View style={styles.actionDivider} />

        {/* 4. Xóa */}
        <Pressable
          style={({ pressed }) => [
            styles.compactActionBtn,
            pressed && styles.actionBtnPressed,
          ]}
          onPress={() => onDelete(item)}
          hitSlop={8}
          accessibilityLabel="Xóa khách hàng"
        >
          <Feather name="trash-2" size={15} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0284C7',
  },
  customerInfoWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  phoneTextCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  metaDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  inbodyCountText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#0284C7',
  },
  goalTextCompact: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#94A3B8',
    marginTop: 1,
  },
  cardActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  ptPackageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  ptPackageBtnPressed: {
    backgroundColor: '#EDE9FE',
  },
  ptPackageBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#7C3AED',
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#F1F5F9',
  },
  compactActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.94 }],
  },
});
