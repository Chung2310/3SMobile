import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm-1',
    sender: 'ai',
    text: 'Xin chào HLV! Tôi là Trợ lý AI của 3S Wellness. Tôi có thể giúp bạn phân tích chỉ số InBody của học viên, tính toán Macro dinh dưỡng hoặc đề xuất giáo án tập luyện chuyên sâu.',
    time: 'Vừa xong',
  },
];

const SUGGESTIONS = [
  'Phân tích chỉ số InBody học viên mới',
  'Gợi ý giáo án siết mỡ cho nữ 53kg',
  'Tính Macro tăng cơ 2.400 kcal/ngày',
  'Đánh giá nguy cơ học viên giảm cơ',
];

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [thinking, setThinking] = useState(false);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      time: 'Bây giờ',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setThinking(true);

    // AI trả lời mô phỏng theo chuẩn thể thao 3S
    setTimeout(() => {
      let reply = '';
      if (text.includes('InBody') || text.includes('chỉ số')) {
        reply =
          'Theo dữ liệu InBody gần nhất: Học viên Trần Minh Hoàng có tỷ lệ mỡ giảm từ 24.5% xuống 20.0% (-4.5%), khối lượng cơ tăng +1.8kg. Phong độ đạt mức Xuất sắc. Khuyến nghị: Tiếp tục duy trì phác đồ tăng tạ Progressive Overload.';
      } else if (text.includes('giáo án') || text.includes('siết mỡ')) {
        reply =
          'Gợi ý giáo án siết mỡ 4 buổi/tuần: Buổi 1 (Chân - Mông Hypertrophy), Buổi 2 (Lưng - Tay trước + HIIT 15p), Buổi 3 (Ngực - Vai - Tay sau), Buổi 4 (Full body circuit + Abs). Giữ mức tạ RPE 7-8.';
      } else if (text.includes('Macro') || text.includes('kcal') || text.includes('dinh dưỡng')) {
        reply =
          'Phân bổ Macro mục tiêu 2.400 kcal: Đạm 160g (27%), Tinh bột phức hợp 280g (47%), Chất béo tốt 70g (26%). Khuyên học viên uống tối thiểu 2.5 - 3 lít nước mỗi ngày.';
      } else {
        reply =
          'Tôi đã ghi nhận yêu cầu của HLV. Đang đối soát với lịch tập và chỉ số của học viên phụ trách để đưa ra phương án tối ưu nhất!';
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        time: 'Bây giờ',
      };
      setMessages((prev) => [...prev, aiMsg]);
      setThinking(false);
    }, 800);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.aiBadge}>
            <Feather name="cpu" size={16} color="#22C55E" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>Trợ lý PT AI</Text>
            <Text style={styles.headerSub}>3S WELLNESS ASSISTANT</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 48) + 80 },
          ]}
        >
          {/* Gợi ý nhanh */}
          <Text style={styles.sectionLabel}>CÂU HỎI THƯỜNG GẶP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {SUGGESTIONS.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSend(item)}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              >
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Lịch sử chat */}
          <View style={styles.chatArea}>
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <View
                  key={msg.id}
                  style={[styles.msgWrapper, isAi ? styles.msgWrapperAi : styles.msgWrapperUser]}
                >
                  <View style={[styles.msgBubble, isAi ? styles.bubbleAi : styles.bubbleUser]}>
                    <Text style={[styles.msgText, isAi ? styles.textAi : styles.textUser]}>
                      {msg.text}
                    </Text>
                  </View>
                  <Text style={styles.msgTime}>{msg.time}</Text>
                </View>
              );
            })}

            {thinking ? (
              <View style={[styles.msgWrapper, styles.msgWrapperAi]}>
                <View style={[styles.msgBubble, styles.bubbleAi]}>
                  <Text style={[styles.msgText, styles.textAi]}>Đang phân tích dữ liệu...</Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Khung nhập tin nhắn */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom:
                Platform.OS === 'android'
                  ? Math.max(insets.bottom, 48) + 70
                  : Math.max(insets.bottom, 16) + 70,
            },
          ]}
        >
          <View style={styles.inputBox}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhập câu hỏi hoặc yêu cầu cho AI..."
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />
            <Pressable
              onPress={() => handleSend()}
              disabled={!inputText.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Feather name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.8,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipPressed: {
    backgroundColor: '#F3F4F6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  chatArea: {
    gap: 12,
  },
  msgWrapper: {
    maxWidth: '85%',
  },
  msgWrapperAi: {
    alignSelf: 'flex-start',
  },
  msgWrapperUser: {
    alignSelf: 'flex-end',
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#22C55E',
    borderTopRightRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
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
    color: colors.textMuted,
    marginTop: 3,
    marginHorizontal: 4,
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
