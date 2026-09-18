import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { SECTION_CATEGORIES } from '@/components/admin/adminSections';
import { colors } from '@/theme';

export default function AdminModulesScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const navigateToSection = (section: string) => {
    router.push({ pathname: '/(app)/admin/[section]', params: { section } });
  };

  // Danh sách phân hệ lọc theo quyền và từ khóa tìm kiếm
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SECTION_CATEGORIES.map((cat) => {
      const filteredItems = cat.items.filter((item) => {
        if (item.superOnly && !isSuperAdmin) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.key.toLowerCase().includes(q)
        );
      });
      return { ...cat, items: filteredItems };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery, isSuperAdmin]);

  const totalSections = useMemo(() => {
    return SECTION_CATEGORIES.reduce((acc, cat) => {
      return acc + cat.items.filter((i) => !i.superOnly || isSuperAdmin).length;
    }, 0);
  }, [isSuperAdmin]);

  return (
    <Screen
      title="PHÂN HỆ QUẢN TRỊ"
      subtitle={`${totalSections} chức năng hệ thống`}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(app)/admin');
        }
      }}
      scroll={false}
    >
      <ScrollView
        style={styles.modulesScroll}
        contentContainerStyle={[
          styles.modulesScrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Thanh tìm kiếm nhanh chức năng */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm kiếm phân hệ, HLV, gói tập, credit..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              style={styles.clearSearchBtn}
              accessibilityLabel="Xóa tìm kiếm"
            >
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Danh mục phân hệ quản trị */}
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyModulesWrap}>
            <Ionicons name="search" size={32} color={colors.textMuted} />
            <Text style={styles.emptyModulesText}>
              {`Không tìm thấy phân hệ khớp với "${searchQuery}"`}
            </Text>
          </View>
        ) : (
          filteredCategories.map((category) => (
            <View key={category.title} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryCount}>
                  {category.items.length} mục
                </Text>
              </View>

              <View style={styles.categoryCard}>
                {category.items.map((item, index) => {
                  const isLast = index === category.items.length - 1;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => navigateToSection(item.key)}
                      style={({ pressed }) => [
                        styles.moduleRow,
                        pressed && styles.moduleRowPressed,
                        !isLast && styles.moduleRowBorder,
                      ]}
                    >
                      <View style={styles.moduleIconBox}>
                        <Ionicons
                          name={item.iconName}
                          size={20}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.moduleInfo}>
                        <View style={styles.moduleTitleRow}>
                          <Text style={styles.moduleTitle}>{item.title}</Text>
                          {item.superOnly && (
                            <View style={styles.superBadge}>
                              <Text style={styles.superBadgeText}>SUPER</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.moduleDesc} numberOfLines={1}>
                          {item.desc}
                        </Text>
                      </View>

                      <Feather
                        name="chevron-right"
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Nút Đăng xuất an toàn */}
        <View style={styles.footerSection}>
          <Pressable
            onPress={() => setShowLogoutModal(true)}
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && styles.logoutBtnPressed,
            ]}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Đăng xuất quản trị</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc quản trị?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowLogoutModal(false)}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowLogoutModal(false);
                  void signOut();
                }}
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.modalConfirmText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modulesScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modulesScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },

  categorySection: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  categoryCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 56,
  },
  moduleRowPressed: {
    backgroundColor: '#F0F9FF',
  },
  moduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  moduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  superBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  superBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  moduleDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  emptyModulesWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyModulesText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footerSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    minHeight: 44,
  },
  logoutBtnPressed: {
    backgroundColor: '#FEE2E2',
  },
  logoutBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
