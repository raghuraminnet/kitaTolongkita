import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { chatApi } from '../../api/chat';
import type { ConversationDto, ChatMessageDto } from '../../api/chat';

const MOCK_CONVERSATIONS: ConversationDto[] = [
  { id: '1', otherParticipantName: 'Nur Aisyah Boutique', lastMessage: 'The pickup time has been updated to 6PM.', lastMessageAt: new Date(Date.now() - 120000).toISOString(), unreadCount: 1, dealId: '1' },
  { id: '2', otherParticipantName: 'TechGadgets MY', lastMessage: 'Your order has been dispatched!', lastMessageAt: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0, dealId: '2' },
  { id: '3', otherParticipantName: 'Batik Heritage', lastMessage: 'Thank you for joining! 🎉', lastMessageAt: new Date(Date.now() - 86400000).toISOString(), unreadCount: 0, dealId: '3' },
];

export const ChatInboxScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
    try {
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch {
      setConversations(MOCK_CONVERSATIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const openConversation = async (conv: ConversationDto) => {
    setActiveConversation(conv);
    try {
      const msgs = await chatApi.getMessages(conv.id);
      setMessages(msgs.reverse()); // oldest first for display
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !activeConversation || sending) return;
    setSending(true);
    try {
      const msg = await chatApi.sendMessage({
        conversationId: activeConversation.id,
        content: messageText.trim(),
      });
      setMessages(prev => [...prev, msg]);
      setMessageText('');
    } catch {
      // ignore send errors silently
    } finally {
      setSending(false);
    }
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // ── Message Thread View ─────────────────────────────────────────────────
  if (activeConversation) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.threadHeader}>
          <TouchableOpacity onPress={() => setActiveConversation(null)}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Avatar name={activeConversation.otherParticipantName} size={36} />
          <Text style={styles.threadTitle}>{activeConversation.otherParticipantName}</Text>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.messageBubble, item.isMine ? styles.myMessage : styles.theirMessage]}>
              <Text style={[styles.messageText, item.isMine ? styles.myMessageText : styles.theirMessageText]}>
                {item.content}
              </Text>
              <Text style={[styles.messageTime, item.isMine ? styles.myMessageTime : styles.theirMessageTime]}>
                {timeAgo(item.createdAt)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={colors['on-surface-variant']}
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Conversation List View ───────────────────────────────────────────────
  const renderConv = ({ item }: { item: ConversationDto }) => (
    <TouchableOpacity style={styles.convItem} onPress={() => openConversation(item)} activeOpacity={0.7}>
      <Avatar name={item.otherParticipantName} size={52} />
      <View style={styles.convContent}>
        <View style={styles.convHeader}>
          <Text style={styles.convName}>{item.otherParticipantName}</Text>
          <Text style={styles.convTime}>{timeAgo(item.lastMessageAt)}</Text>
        </View>
        <View style={styles.convFooter}>
          <Text style={styles.convLastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity>
          <Text style={styles.newChatBtn}>✏️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConv}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.convList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Start a chat from a deal page!</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
  },
  backBtn: { fontSize: 24, color: colors['on-surface'] },
  headerTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700',
    color: colors['on-background'],
  },
  newChatBtn: { fontSize: 22 },
  convList: { paddingBottom: 100 },
  convItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1,
    borderBottomColor: colors['outline-variant'],
    backgroundColor: colors['surface-container-lowest'],
  },
  convContent: { flex: 1, marginLeft: spacing.md },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: {
    fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600',
    color: colors['on-surface'],
  },
  convTime: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'],
  },
  convFooter: { flexDirection: 'row', alignItems: 'center' },
  convLastMessage: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14,
    color: colors['on-surface-variant'],
  },
  unreadBadge: {
    backgroundColor: colors['primary-container'], borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  unreadText: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, fontWeight: '600',
    color: colors.white,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 20, fontWeight: '700',
    color: colors['on-background'], marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
  },
  // Thread view
  threadHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
    backgroundColor: colors['surface-container-lowest'],
  },
  threadTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700',
    color: colors['on-background'],
  },
  messageList: { padding: spacing.md, paddingBottom: spacing.xl },
  messageBubble: {
    maxWidth: '75%', borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  myMessage: { alignSelf: 'flex-end', backgroundColor: colors['primary-container'] },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: colors['surface-container'] },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20 },
  myMessageText: { color: colors.white },
  theirMessageText: { color: colors['on-surface'] },
  messageTime: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  theirMessageTime: { color: colors['on-surface-variant'] },
  emptyMessages: { alignItems: 'center', paddingTop: 40 },
  emptyText: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md,
    paddingTop: spacing.sm, backgroundColor: colors['surface-container-lowest'],
    borderTopWidth: 1, borderTopColor: colors['outline-variant'],
    gap: spacing.sm,
  },
  textInput: {
    flex: 1, backgroundColor: colors['surface-container'], borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: 'Inter_400Regular',
    fontSize: 15, color: colors['on-surface'], maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors['primary-container'],
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors['outline-variant'] },
  sendBtnText: { fontSize: 18, color: colors.white },
});
