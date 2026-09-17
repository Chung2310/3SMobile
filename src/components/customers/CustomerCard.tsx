import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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

const handleCall = (phone?: string) => {
  if (!phone) return;
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (!cleanPhone) return;
  Linking.openURL(`tel:${cleanPhone}`).catch(() => {
    Alert.alert('Không thể gọi điện', `Không thể mở ứng dụng gọi điện cho số: ${cleanPhone}`);
  });
};

const handleSms = (phone?: string) => {
  if (!phone) return;
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (!cleanPhone) return;
  Linking.openURL(`sms:${cleanPhone}`).catch(() => {
    Alert.alert('Không thể gửi tin nhắn', `Không thể mở ứng dụng tin nhắn cho số: ${cleanPhone}`);
  });
};

const handleZalo = (phone?: string) => {
  if (!phone) return;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return;
  Linking.openURL(`https://zalo.me/${cleanPhone}`).catch(() => {
    Alert.alert('Không thể mở Zalo', `Không thể kết nối Zalo cho số: ${cleanPhone}`);
  });
};

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
      <View style={styles.cardMainRow}>
        <Pressable
          style={({ pressed }) => [
            styles.avatarMini,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => onPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`Xem hồ sơ ${item.fullName}`}
        >
          <Text style={styles.avatarMiniText}>
            {item.fullName.trim().charAt(0).toUpperCase()}
          </Text>
        </Pressable>

        <View style={styles.customerInfoWrap}>
          {/* Tên & Badge tiến bộ */}
          <Pressable
            style={({ pressed }) => [
              styles.nameRow,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => onPress(item)}
          >
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
          </Pressable>

          {/* SĐT kèm 3 icon nhanh (Gọi điện, SMS, Zalo) & Số phiếu InBody */}
          <View style={styles.metaRow}>
            {item.phone ? (
              <View style={styles.phoneGroup}>
                <Pressable
                  onPress={() => handleCall(item.phone)}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Gọi điện cho ${item.fullName}`}
                >
                  <Text style={styles.phoneTextCompact}>{item.phone}</Text>
                </Pressable>

                <View style={styles.contactActions}>
                  {/* Nút 1: Gọi điện thoại */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.contactBtn,
                      styles.callBtn,
                      pressed && styles.contactBtnPressed,
                    ]}
                    onPress={() => handleCall(item.phone)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Gọi điện cho ${item.fullName}`}
                  >
                    <Feather name="phone" size={11} color="#0284C7" />
                  </Pressable>

                  {/* Nút 2: Nhắn tin SMS */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.contactBtn,
                      styles.smsBtn,
                      pressed && styles.contactBtnPressed,
                    ]}
                    onPress={() => handleSms(item.phone)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Nhắn tin SMS cho ${item.fullName}`}
                  >
                    <Feather name="message-square" size={11} color="#16A34A" />
                  </Pressable>

                  {/* Nút 3: Mở Zalo */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.contactBtn,
                      styles.zaloBtn,
                      pressed && styles.contactBtnPressed,
                    ]}
                    onPress={() => handleZalo(item.phone)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Nhắn Zalo cho ${item.fullName}`}
                  >
                    <Text style={styles.zaloBtnText}>Zalo</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {item.phone ? <Text style={styles.metaDot}>•</Text> : null}

            <Pressable
              onPress={() => onPress(item)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={styles.inbodyCountText}>
                {item.measurementCount || 0} phiếu InBody
              </Text>
            </Pressable>
          </View>

          {/* Mục tiêu rút gọn 1 dòng */}
          {item.initialGoal ? (
            <Pressable onPress={() => onPress(item)}>
              <Text style={styles.goalTextCompact} numberOfLines={1}>
                Mục tiêu: {item.initialGoal}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

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
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  phoneGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactBtn: {
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.92 }],
  },
  callBtn: {
    width: 24,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  smsBtn: {
    width: 24,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  zaloBtn: {
    paddingHorizontal: 7,
    backgroundColor: '#0068FF',
  },
  zaloBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  phoneTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
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
