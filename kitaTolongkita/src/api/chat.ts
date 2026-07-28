import { request } from './client';

export interface ConversationDto {
  id: string;
  otherParticipantName: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  dealId: string | null;
}

export interface ChatMessageDto {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

export const chatApi = {
  /** Get all conversations for the current user */
  getConversations: () =>
    request<ConversationDto[]>('GET', '/chat/conversations', undefined, true),

  /** Get messages in a conversation */
  getMessages: (conversationId: string, page = 1) =>
    request<ChatMessageDto[]>('GET', `/chat/${conversationId}/messages?page=${page}`, undefined, true),

  /** Send a message — pass conversationId to reply, or recipientId/email for new conversation */
  sendMessage: (data: {
    conversationId?: string;
    recipientId?: string;
    recipientEmail?: string;
    dealId?: string;
    content: string;
  }) =>
    request<ChatMessageDto>('POST', '/chat/messages', data, true),
};
