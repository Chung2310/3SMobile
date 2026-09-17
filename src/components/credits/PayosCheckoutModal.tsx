import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/services/api/client';

export interface MobilePaymentOrder {
  id: string;
  orderCode: string;
  gateway: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  source?: string;
  amountVnd: number;
  baseCredits: number;
  bonusCredits: number;
  grantCredits: number;
  expiresAt: string;
  redirectUrl?: string;
  qrCodeUrl?: string;
}

interface PayosCheckoutModalProps {
  visible: boolean;
  order: MobilePaymentOrder | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayosCheckoutModal({
  visible,
  order,
  onClose,
  onSuccess,
}: PayosCheckoutModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED'>('PENDING');
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);

  useEffect(() => {
    if (!order) return;
    setStatus(order.status);
    const expiresMs = new Date(order.expiresAt).getTime() - Date.now();
    setTimeLeft(Math.max(0, Math.floor(expiresMs / 1000)));
  }, [order]);

  // Countdown timer
  useEffect(() => {
    if (!visible || status !== 'PENDING' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, status, timeLeft]);

  // Polling check order status every 2.5s
  useEffect(() => {
    if (!visible || !order || status !== 'PENDING') return;

    let active = true;
    const checkStatus = async () => {
      try {
        const latest = await api.get<MobilePaymentOrder>(`/api/credits/topups/${order.id}`);
        if (!active) return;
        if (latest?.status === 'PAID') {
          setStatus('PAID');
          onSuccess();
        } else if (latest?.status === 'EXPIRED' || latest?.status === 'FAILED') {
          setStatus(latest.status);
        }
      } catch {
        // Ignore background polling errors
      }
    };

    const interval = setInterval(checkStatus, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [visible, order, status, onSuccess]);

  if (!visible || !order) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Ignore
    }
  };

  const memoText = `Nap credit ${order.orderCode.slice(-10)}`;
  const qrRaw = order.qrCodeUrl || '';
  const qrImageUrl = qrRaw.startsWith('http') || qrRaw.startsWith('data:')
    ? qrRaw
    : qrRaw
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrRaw)}&margin=10`
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="qr-code" size={18} color="#003B70" />
              </View>
              <View>
                <Text style={styles.title}>Thanh toán</Text>
                <Text style={styles.subtitle}>Xác nhận tự động 24/7</Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {status === 'PAID' ? (
              <View style={styles.successBox}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                </View>
                <Text style={styles.successTitle}>Thanh toán thành công!</Text>
                <Text style={styles.successDesc}>
                  Đã nạp thành công{' '}
                  <Text style={styles.successCredits}>
                    +{order.grantCredits.toLocaleString('vi-VN')} credit
                  </Text>{' '}
                  vào ví của bạn.
                </Text>

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.doneBtnText}>Xong & Đóng</Text>
                </Pressable>
              </View>
            ) : status === 'EXPIRED' ? (
              <View style={styles.expiredBox}>
                <Ionicons name="alert-circle" size={48} color="#D97706" />
                <Text style={styles.expiredTitle}>Mã thanh toán đã hết hạn</Text>
                <Text style={styles.expiredDesc}>
                  Vui lòng tạo mã mới để tiếp tục nạp credit.
                </Text>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.contentWrap}>
                {/* Status indicator bar */}
                <View style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    <ActivityIndicator size="small" color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={styles.statusText}>Đang chờ chuyển khoản...</Text>
                  </View>
                  <Text style={styles.countdownText}>
                    Còn: <Text style={styles.countdownNumber}>{timeFormatted}</Text>
                  </Text>
                </View>

                {/* QR Code */}
                <View style={styles.qrContainer}>
                  {qrImageUrl ? (
                    <Image
                      source={{ uri: qrImageUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code-outline" size={48} color="#94A3B8" />
                      <Text style={styles.qrPlaceholderText}>Đang tải mã VietQR...</Text>
                    </View>
                  )}
                  <Text style={styles.qrNote}>Quét mã bằng App ngân hàng bất kỳ</Text>
                </View>

                {/* Transfer Details Card */}
                <View style={styles.detailsBox}>
                  {/* Số tiền */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Số tiền cần chuyển:</Text>
                    <View style={styles.detailValueRow}>
                      <Text style={styles.detailAmountText}>
                        {order.amountVnd.toLocaleString('vi-VN')} đ
                      </Text>
                      <Pressable
                        onPress={() => copyToClipboard(String(order.amountVnd), 'amount')}
                        hitSlop={8}
                        style={styles.copyBtn}
                      >
                        <Ionicons
                          name={copiedField === 'amount' ? 'checkmark' : 'copy-outline'}
                          size={14}
                          color={copiedField === 'amount' ? '#16A34A' : '#0284C7'}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Nội dung */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nội dung chuyển khoản:</Text>
                    <View style={styles.detailValueRow}>
                      <View style={styles.memoBadge}>
                        <Text style={styles.memoText}>{memoText}</Text>
                      </View>
                      <Pressable
                        onPress={() => copyToClipboard(memoText, 'memo')}
                        hitSlop={8}
                        style={styles.copyBtn}
                      >
                        <Ionicons
                          name={copiedField === 'memo' ? 'checkmark' : 'copy-outline'}
                          size={14}
                          color={copiedField === 'memo' ? '#16A34A' : '#0284C7'}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Credit nhận được */}
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>Credit nhận được:</Text>
                    <Text style={styles.detailCreditText}>
                      +{order.grantCredits.toLocaleString('vi-VN')} credit
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {order.redirectUrl && (
                    <Pressable
                      style={({ pressed }) => [styles.payosLinkBtn, pressed && { opacity: 0.85 }]}
                      onPress={() => order.redirectUrl && Linking.openURL(order.redirectUrl)}
                    >
                      <Feather name="external-link" size={13} color="#003B70" style={{ marginRight: 5 }} />
                      <Text style={styles.payosLinkText}>Mở trang thanh toán</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={({ pressed }) => [styles.closeModalBtn, pressed && { opacity: 0.75 }]}
                    onPress={onClose}
                  >
                    <Text style={styles.closeModalText}>Đóng</Text>
                  </Pressable>
                </View>

                {/* Security footer */}
                <View style={styles.footerNote}>
                  <Ionicons name="shield-checkmark" size={13} color="#16A34A" style={{ marginRight: 4 }} />
                  <Text style={styles.footerNoteText}>Thanh toán an toàn 24/7</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003B70',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
  },
  contentWrap: {
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  countdownNumber: {
    color: '#E11D48',
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#BAE6FD',
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  qrImage: {
    width: 210,
    height: 210,
    borderRadius: 10,
  },
  qrPlaceholder: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
  },
  qrNote: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  detailsBox: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003B70',
  },
  memoBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: 4,
  },
  detailCreditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 14,
  },
  payosLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingVertical: 10,
  },
  payosLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003B70',
  },
  closeModalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  successDesc: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  successCredits: {
    color: '#16A34A',
    fontWeight: '800',
  },
  doneBtn: {
    marginTop: 20,
    backgroundColor: '#003B70',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 11,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expiredBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  expiredTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#B45309',
  },
  expiredDesc: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  cancelBtn: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
