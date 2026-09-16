import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme';
import { fetchCustomersList } from '@/services/customerService';
import {
  createConversation,
  fetchConversationDetail,
  fetchConversations,
  sendConversationMessage,
  type AssistantConversation,
  type AssistantMessage,
} from '@/services/assistantService';
import type { CustomerProfile } from '@/types/domain';

const WELCOME_MESSAGE: AssistantMessage = {
  _id: 'welcome-initial',
  role: 'ASSISTANT',
  content:
    'Xin chào HLV! Tôi là Trợ lý AI của 3S Wellness.\n\nTôi có thể hỗ trợ bạn:\n- Phân tích chi tiết chỉ số InBody và % mỡ\n- Tính toán Macro calo / đạm theo mục tiêu\n- Đề xuất giáo án tập luyện và phân bổ buổi tập\n- Hướng dẫn kỹ thuật bài tập và phòng ngừa chấn thương\n\n💡 Mẹo: Bấm "+ Học viên" ở góc trên để tôi đọc trực tiếp chỉ số InBody và tư vấn riêng cho học viên đó!',
  createdAt: new Date().toISOString(),
};

const QUICK_SUGGESTIONS_GENERAL = [
  'Cách tính thâm hụt calo chuẩn cho nữ',
  'Nguyên tắc phân bổ lịch tập PPL 4 buổi',
  'Hướng dẫn kỹ thuật gồng bụng (Bracing)',
  'Đọc và phân tích các chỉ số InBody',
];

const QUICK_SUGGESTIONS_CUSTOMER = [
  'Phân tích chỉ số InBody gần nhất của học viên',
  'Gợi ý giáo án tối ưu cho học viên này',
  'Tính Macro dinh dưỡng phù hợp mục tiêu',
  'Đánh giá rủi ro chấn thương và lưu ý khi tập',
];

function formatMessageDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const timeStr = d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return `${timeStr} • Hôm nay`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `${timeStr} • Hôm qua`;
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${timeStr} • ${day}/${month}/${year}`;
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Data state
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AssistantConversation | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Customer state
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // History state
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Keyboard state for exact elevation
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 1. Keyboard event listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 60);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 2. Load conversations & customers on mount
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingInitial(true);
      const [convs, custList] = await Promise.all([
        fetchConversations({ page: 1, limit: 30 }),
        fetchCustomersList({ limit: 100 }),
      ]);

      setConversations(convs);
      setCustomers(custList);

      // If conversations exist, load the most recent one
      if (convs.length > 0) {
        const latest = convs[0];
        setActiveConversation(latest);
        if (latest.messages && latest.messages.length > 0) {
          setMessages(latest.messages);
        }
        if (latest.customerId) {
          const matchedCust = custList.find((c) => c._id === latest.customerId);
          if (matchedCust) setSelectedCustomer(matchedCust);
        }
      }
    } catch {
      // Graceful fallback to welcome message
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // Auto scroll only when there are new messages or AI is generating
  useEffect(() => {
    if (messages.length > 1 || isGenerating) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length, isGenerating]);

  // 3. Handlers
  const handleStartNewChat = () => {
    setActiveConversation(null);
    setSelectedCustomer(null);
    setMessages([WELCOME_MESSAGE]);
    setInputText('');
    setShowHistoryModal(false);
  };

  const handleSelectConversation = async (conv: AssistantConversation) => {
    setShowHistoryModal(false);
    setActiveConversation(conv);

    if (conv.customerId) {
      const matched = customers.find((c) => c._id === conv.customerId);
      setSelectedCustomer(matched || null);
    } else {
      setSelectedCustomer(null);
    }

    try {
      const detail = await fetchConversationDetail(conv._id);
      if (detail?.messages && detail.messages.length > 0) {
        setMessages(detail.messages);
      } else if (conv.messages && conv.messages.length > 0) {
        setMessages(conv.messages);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    } catch {
      if (conv.messages && conv.messages.length > 0) {
        setMessages(conv.messages);
      }
    }
  };

  const handleSelectCustomer = (customer: CustomerProfile | null) => {
    setSelectedCustomer(customer);
    setShowCustomerPicker(false);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGenerating) return;

    setInputText('');
    setIsGenerating(true);

    const optimisticUserMsg: AssistantMessage = {
      _id: `user-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      if (activeConversation?._id) {
        const updated = await sendConversationMessage(activeConversation._id, {
          content: text,
          requestType: 'GENERAL',
        });
        setActiveConversation(updated);
        setMessages(updated.messages || []);
        setConversations((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c))
        );
      } else {
        const title = text.length > 35 ? `${text.slice(0, 35)}...` : text;
        const newConv = await createConversation({
          title,
          customerId: selectedCustomer?._id,
        });

        const withMsg = await sendConversationMessage(newConv._id, {
          content: text,
          requestType: 'GENERAL',
        });

        setActiveConversation(withMsg);
        setMessages(withMsg.messages || []);
        setConversations((prev) => [withMsg, ...prev]);
      }
    } catch (err) {
      const errText =
        err instanceof Error ? err.message : '3S AI tạm thời không phản hồi. Vui lòng thử lại sau.';
      const fallbackAiMsg: AssistantMessage = {
        _id: `ai-err-${Date.now()}`,
        role: 'ASSISTANT',
        content: `⚠️ ${errText}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered customers for picker
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.initialGoal && c.initialGoal.toLowerCase().includes(q))
    );
  });

  const suggestions = selectedCustomer ? QUICK_SUGGESTIONS_CUSTOMER : QUICK_SUGGESTIONS_GENERAL;

  // Exact tab bar height calculation
  const tabBarHeight =
    50 + (Platform.OS === 'android' ? Math.max(insets.bottom, 6) : Math.max(insets.bottom, 10));

  // Android lifts inputContainer directly above keyboard (accounting for navigation bar offset)
  const androidLift =
    Platform.OS === 'android' && keyboardHeight > 0
      ? Math.max(0, keyboardHeight - tabBarHeight + 52)
      : 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.navigate('/(app)/(tabs)')}
            hitSlop={10}
            style={styles.backBtn}
            accessibilityLabel="Quay lại"
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.botIconWrapper}>
            <Feather name="cpu" size={18} color={colors.primary} />
          </View>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Trợ lý PT 3S
            </Text>
            <Text style={styles.headerSubtitle}>3S WELLNESS AI</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowHistoryModal(true)}
            hitSlop={8}
            style={styles.headerActionBtn}
            accessibilityLabel="Lịch sử các phiên chat"
          >
            <Feather name="clock" size={18} color={colors.primaryNavy} />
            {conversations.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{conversations.length}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={handleStartNewChat}
            hitSlop={8}
            style={[styles.headerActionBtn, styles.newChatBtn]}
            accessibilityLabel="Bắt đầu đoạn chat mới"
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.newChatText}>Mới</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Customer Link Bar */}
      <View style={styles.customerBar}>
        {selectedCustomer ? (
          <View style={styles.customerLinkedCard}>
            <View style={styles.customerAvatarSmall}>
              <Text style={styles.customerAvatarSmallText}>
                {selectedCustomer.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerLinkedInfo}>
              <Text style={styles.customerLinkedName} numberOfLines={1}>
                {selectedCustomer.fullName}
              </Text>
              <Text style={styles.customerLinkedDetail} numberOfLines={1}>
                {selectedCustomer.initialGoal || selectedCustomer.phone || 'Đã liên kết InBody'}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCustomerPicker(true)}
              hitSlop={8}
              style={styles.customerSwitchBtn}
            >
              <Text style={styles.customerSwitchText}>Đổi</Text>
            </Pressable>
            <Pressable
              onPress={() => handleSelectCustomer(null)}
              hitSlop={8}
              style={styles.customerRemoveBtn}
            >
              <Feather name="x" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowCustomerPicker(true)}
            style={styles.customerUnlinkedBtn}
          >
            <View style={styles.customerUnlinkedLeft}>
              <Feather name="user-plus" size={15} color={colors.primary} />
              <Text style={styles.customerUnlinkedText}>
                + Liên kết học viên để AI đọc InBody & hồ sơ
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* 3. Main Chat Stream & Keyboard-Safe Input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Quick Suggestions - placed at top */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>GỢI Ý CÂU HỎI NHANH</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
            >
              {suggestions.map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSend(item)}
                  disabled={isGenerating}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    pressed && styles.suggestionChipPressed,
                  ]}
                >
                  <Text style={styles.suggestionChipText}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Messages */}
          <View style={styles.chatArea}>
            {loadingInitial ? (
              <View style={styles.loadingInitialBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingInitialText}>Đang nạp dữ liệu trợ lý...</Text>
              </View>
            ) : null}

            {messages.map((msg, index) => {
              const isAi = msg.role === 'ASSISTANT';
              const formattedTime = formatMessageDateTime(msg.createdAt);

              return (
                <View
                  key={msg._id || `msg-${index}`}
                  style={[
                    styles.msgWrapper,
                    isAi ? styles.msgWrapperAi : styles.msgWrapperUser,
                  ]}
                >
                  {isAi && (
                    <View style={styles.aiMessageAvatar}>
                      <Feather name="cpu" size={14} color={colors.primary} />
                    </View>
                  )}

                  <View
                    style={[
                      styles.msgBubble,
                      isAi ? styles.bubbleAi : styles.bubbleUser,
                    ]}
                  >
                    <Text style={[styles.msgText, isAi ? styles.textAi : styles.textUser]}>
                      {msg.content}
                    </Text>
                    {formattedTime ? (
                      <Text style={[styles.msgTime, isAi ? styles.timeAi : styles.timeUser]}>
                        {formattedTime}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {isGenerating ? (
              <View style={[styles.msgWrapper, styles.msgWrapperAi]}>
                <View style={styles.aiMessageAvatar}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
                <View style={[styles.msgBubble, styles.bubbleAi, styles.bubbleThinking]}>
                  <Text style={styles.thinkingText}>3S AI đang phân tích dữ liệu & phản hồi...</Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* 4. Input Box - Always elevated directly above keyboard */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: 8,
              marginBottom: androidLift,
            },
          ]}
        >
          <View style={styles.inputBox}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Hỏi AI về InBody, giáo án, dinh dưỡng..."
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
            <Pressable
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isGenerating}
              style={({ pressed }) => [
                styles.sendBtn,
                (!inputText.trim() || isGenerating) && styles.sendBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityLabel="Gửi câu hỏi"
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="send" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 5. Customer Picker Modal */}
      <Modal
        visible={showCustomerPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCustomerPicker(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chọn học viên tư vấn</Text>
                <Text style={styles.modalSub}>
                  AI sẽ đọc hồ sơ & InBody gần nhất của học viên này
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCustomerPicker(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <Feather name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Tìm theo tên hoặc số điện thoại..."
                placeholderTextColor={colors.textMuted}
                style={styles.modalSearchInput}
                autoCorrect={false}
              />
              {customerSearch ? (
                <Pressable onPress={() => setCustomerSearch('')} hitSlop={6}>
                  <Feather name="x-circle" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Default Unlinked Option */}
            <Pressable
              onPress={() => handleSelectCustomer(null)}
              style={[
                styles.customerItemRow,
                !selectedCustomer && styles.customerItemRowActive,
              ]}
            >
              <View style={[styles.customerAvatarList, { backgroundColor: colors.surfaceMuted }]}>
                <Feather name="globe" size={18} color={colors.textMuted} />
              </View>
              <View style={styles.customerItemInfo}>
                <Text style={styles.customerItemName}>Tư vấn chung (Không chọn học viên)</Text>
                <Text style={styles.customerItemSub}>Dành cho câu hỏi lý thuyết, chuyên môn</Text>
              </View>
              {!selectedCustomer && (
                <Feather name="check" size={18} color={colors.primary} />
              )}
            </Pressable>

            {/* Customer List */}
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const isSelected = selectedCustomer?._id === item._id;
                return (
                  <Pressable
                    onPress={() => handleSelectCustomer(item)}
                    style={[
                      styles.customerItemRow,
                      isSelected && styles.customerItemRowActive,
                    ]}
                  >
                    <View style={styles.customerAvatarList}>
                      <Text style={styles.customerAvatarListText}>
                        {item.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.customerItemInfo}>
                      <Text style={styles.customerItemName} numberOfLines={1}>
                        {item.fullName}
                      </Text>
                      <Text style={styles.customerItemSub} numberOfLines={1}>
                        {item.phone || 'Chưa có SĐT'} {item.initialGoal ? `• ${item.initialGoal}` : ''}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather name="check" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyCustomerBox}>
                  <Text style={styles.emptyCustomerText}>Không tìm thấy học viên phù hợp</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. Chat History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowHistoryModal(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Lịch sử các phiên chat</Text>
                <Text style={styles.modalSub}>
                  {conversations.length} cuộc trò chuyện đã lưu
                </Text>
              </View>
              <Pressable
                onPress={() => setShowHistoryModal(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Start New Chat Button */}
            <Pressable
              onPress={handleStartNewChat}
              style={styles.modalNewChatBtn}
            >
              <Feather name="plus-circle" size={18} color="#FFFFFF" />
              <Text style={styles.modalNewChatText}>Bắt đầu cuộc trò chuyện mới</Text>
            </Pressable>

            {/* History List */}
            <FlatList
              data={conversations}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
              renderItem={({ item }) => {
                const isActive = activeConversation?._id === item._id;
                const dateStr = item.updatedAt
                  ? new Date(item.updatedAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const msgCount = item.messages?.length || 0;

                return (
                  <Pressable
                    onPress={() => handleSelectConversation(item)}
                    style={[
                      styles.historyItemRow,
                      isActive && styles.historyItemRowActive,
                    ]}
                  >
                    <View style={styles.historyItemLeft}>
                      <View
                        style={[
                          styles.historyIconWrapper,
                          isActive && { backgroundColor: 'rgba(2, 132, 199, 0.15)' },
                        ]}
                      >
                        <Feather
                          name="message-square"
                          size={16}
                          color={isActive ? colors.primary : colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.historyTitle,
                            isActive && { color: colors.primary, fontWeight: '700' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title || 'Đoạn chat chưa đặt tên'}
                        </Text>
                        <Text style={styles.historyMeta}>
                          {dateStr} {msgCount > 0 ? `• ${msgCount} tin nhắn` : ''}
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textMuted} />
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyHistoryBox}>
                  <Feather name="message-circle" size={40} color="#CBD5E1" />
                  <Text style={styles.emptyHistoryText}>Chưa có lịch sử cuộc trò chuyện nào</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  botIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  newChatBtn: {
    backgroundColor: colors.primary,
    gap: 4,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  customerBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  customerLinkedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  customerAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  customerLinkedInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerLinkedName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  customerLinkedDetail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  customerSwitchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  customerSwitchText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  customerRemoveBtn: {
    padding: 4,
  },
  customerUnlinkedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerUnlinkedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  customerUnlinkedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryNavy,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 24,
  },
  suggestionsContainer: {
    marginBottom: spacing.md,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  suggestionsRow: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionChipPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  chatArea: {
    gap: 14,
  },
  loadingInitialBox: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingInitialText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  msgWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '88%',
  },
  msgWrapperAi: {
    alignSelf: 'flex-start',
  },
  msgWrapperUser: {
    alignSelf: 'flex-end',
  },
  aiMessageAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    flexShrink: 1,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleThinking: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  thinkingText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 21,
  },
  textAi: {
    color: colors.text,
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeAi: {
    color: colors.textMuted,
  },
  timeUser: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 90,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  customerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 12,
  },
  customerItemRowActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: colors.primary,
  },
  customerAvatarList: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarListText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  customerItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  customerItemSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  emptyCustomerBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyCustomerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  modalNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryNavy,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  modalNewChatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  historyItemRowActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: colors.primary,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  historyIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyHistoryBox: {
    padding: 36,
    alignItems: 'center',
    gap: 10,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
