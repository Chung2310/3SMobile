import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing, typography } from '@/theme';
import { messageOf } from '@/utils/error';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BANNER_SLIDES = [
  { id: 'slide-1', image: require('../../../assets/public/login-banner-1.png') },
  { id: 'slide-2', image: require('../../../assets/public/login-banner-2.png') },
];

const LOGO_WHITE = require('../../../assets/public/logo-white.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  // Intro Splash state
  const [showIntro, setShowIntro] = useState(true);
  const [introOpacity] = useState(() => new Animated.Value(1));
  const [introScale] = useState(() => new Animated.Value(0.92));

  // Slide state
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoSlideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal Login state
  const [modalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hiệu ứng màn hình giới thiệu (đen + logo brand) trước khi vào
  useEffect(() => {
    // Zoom nhẹ logo
    Animated.timing(introScale, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Giữ màn hình intro trong 1.6s rồi mờ dần
    const timer = setTimeout(() => {
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        setShowIntro(false);
      });
    }, 1600);

    return () => clearTimeout(timer);
  }, [introOpacity, introScale]);

  // Tự động chuyển 2 slide ảnh nét
  useEffect(() => {
    if (showIntro) return;

    autoSlideTimer.current = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % BANNER_SLIDES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4500);

    return () => {
      if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
    };
  }, [showIntro]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < BANNER_SLIDES.length) {
      setActiveSlide(index);
    }
  }, []);

  async function handleSubmit() {
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await signIn(trimmedUser, password);
      setModalVisible(false);
      router.replace('/');
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 1. SLIDER 2 ẢNH GỐC SIÊU NÉT (KHÔNG CHE MỜ) */}
      <FlatList
        ref={flatListRef}
        data={BANNER_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.fullScreen}
        renderItem={({ item }) => (
          <Image
            source={item.image}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        )}
      />

      {/* 2. LOGO WHITE Ở GIỮA PHÍA TRÊN MÀN HÌNH */}
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
        <Image source={LOGO_WHITE} style={styles.logo} resizeMode="contain" />
        <View style={styles.coachBadge}>
          <Feather name="shield" size={12} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.coachBadgeText}>CỔNG HUẤN LUYỆN VIÊN (PT)</Text>
        </View>
        <Text style={styles.brandSub}>GYM - YOGA - ZUMBA - KICKFIT</Text>
      </View>

      {/* 3. KHU VỰC ĐÁY: 2 CHẤM SLIDE, NÚT ĐĂNG NHẬP VÀ DÒNG CHỮ TRỢ LÝ PT AI */}
      <View
        style={[
          styles.bottomArea,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(insets.bottom, 48) + 16
                : Math.max(insets.bottom, 20) + 16,
          },
        ]}
      >
        {/* 2 Slide dots */}
        <View style={styles.dotsRow}>
          {BANNER_SLIDES.map((slide, idx) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                idx === activeSlide ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Button Login màu xanh dương giống mẫu JEFIT */}
        <Pressable
          onPress={() => {
            setError(null);
            setModalVisible(true);
          }}
          style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
        >
          <Text style={styles.loginButtonText}>Đăng nhập Huấn luyện viên</Text>
        </Pressable>

        {/* Dòng chữ yêu cầu: Trợ lý PT AI của 3S WELLNESS */}
        <Text style={styles.assistantFooterText}>Trợ lý PT AI của 3S WELLNESS • Dành riêng cho HLV</Text>
      </View>

      {/* 4. MÀN HÌNH GIỚI THIỆU INTRO (NỀN ĐEN + LOGO TRẮNG Ở GIỮA) */}
      {showIntro ? (
        <Animated.View style={[styles.introScreen, { opacity: introOpacity }]}>
          <Animated.Image
            source={LOGO_WHITE}
            style={[styles.introLogo, { transform: [{ scale: introScale }] }]}
            resizeMode="contain"
          />
        </Animated.View>
      ) : null}

      {/* 5. MODAL FORM ĐĂNG NHẬP ĐƠN GIẢN */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!submitting) setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              if (!submitting) setModalVisible(false);
            }}
          />

          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <View style={styles.sheetPtBadge}>
                  <Feather name="award" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.sheetPtBadgeText}>PT WORKSPACE</Text>
                </View>
                <Text style={styles.sheetTitle}>Đăng nhập HLV</Text>
                <Text style={styles.sheetSubtitle}>Dành riêng cho PT & Ban huấn luyện 3S Gym</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                disabled={submitting}
                hitSlop={12}
                style={styles.closeButton}
              >
                <Feather name="x" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
            >
              {/* Username */}
              <Text style={styles.label}>Tên đăng nhập</Text>
              <View style={styles.inputWrap}>
                <Feather name="user" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Nhập tên đăng nhập"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  editable={!submitting}
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  editable={!submitting}
                  returnKeyType="go"
                  onSubmitEditing={() => void handleSubmit()}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={12}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Submit Button màu xanh dương đồng bộ */}
              <Pressable
                onPress={() => void handleSubmit()}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                  pressed && styles.submitButtonPressed,
                ]}
              >
                {submitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Đang đăng nhập...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Đăng nhập</Text>
                )}
              </Pressable>

              {/* Ghi chú dành cho Hội viên / Customer */}
              <View style={styles.sheetFooterNote}>
                <Feather name="info" size={14} color={colors.textMuted} style={{ marginRight: 6, marginTop: 2 }} />
                <Text style={styles.sheetFooterNoteText}>
                  Ứng dụng di động chỉ hỗ trợ tài khoản Huấn luyện viên (PT). Hội viên vui lòng liên hệ quầy lễ tân hoặc truy cập Web Portal.
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 220,
    height: 75,
  },
  brandSub: {
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 26,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  // Nút Đăng nhập màu xanh dương đậm nét chuẩn mẫu JEFIT (#2F74FF / #3B82F6)
  loginButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#2F74FF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F74FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  loginButtonPressed: {
    backgroundColor: '#2563EB',
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  assistantFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.4,
    marginTop: 14,
    textAlign: 'center',
  },

  // Màn hình giới thiệu ban đầu (nền đen + logo brand ở giữa)
  introScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  introLogo: {
    width: 260,
    height: 90,
  },

  // Modal Sheet Form
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 22,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBody: {
    paddingBottom: spacing.lg,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  inputWrap: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: colors.text,
    ...typography.body,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    height: 52,
    backgroundColor: '#2F74FF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: '#2F74FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonPressed: {
    backgroundColor: '#2563EB',
    transform: [{ scale: 0.99 }],
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.3)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
    marginBottom: 4,
  },
  coachBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sheetPtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceIce,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  sheetPtBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetFooterNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  sheetFooterNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
