import type { RefObject } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { Message } from '@/types/social';
import { ChatAvatar } from './ChatAvatar';
import { formatDateLabel, formatMessageTime } from './helpers';

type ScrollEvent = {
  nativeEvent: {
    contentOffset: { y: number };
    layoutMeasurement: { height: number };
    contentSize: { height: number };
  };
};

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  otherUserId: string;
  displayName: string;
  loadingOlderMessages: boolean;
  hasMoreMessages: boolean;
  messagesLoading: boolean;
  messagesError: string | null;
  onRetry: () => void;
  scrollRef: RefObject<ScrollView | null>;
  onScroll: (event: ScrollEvent) => void;
}

export function MessageList({
  messages,
  currentUserId,
  otherUserId,
  displayName,
  loadingOlderMessages,
  hasMoreMessages,
  messagesLoading,
  messagesError,
  onRetry,
  scrollRef,
  onScroll,
}: MessageListProps) {
  const { t } = useTranslation('social');

  // Group messages by date divider label
  type DateGroup = { label: string; msgs: Message[] };
  const groups: DateGroup[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerStyle={styles.messageContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={100}
      // Without this, scrolling near the top to trigger loadOlderMessages
      // prepends content above the current viewport with no scroll-offset
      // compensation, causing a visible jump. Same fix the Feed FlatList
      // already uses for the same class of problem (new content above the
      // viewport) — see app/(tabs)/social/index.tsx.
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
    >
      {/* Older messages loader */}
      {loadingOlderMessages && (
        <ActivityIndicator color="#404040" style={{ marginBottom: 12 }} />
      )}

      {/* "All caught up" hint when no more history */}
      {!hasMoreMessages && messages.length > 0 && (
        <View className="flex-row items-center gap-2.5 mb-2">
          <Text className="font-heading text-[9px] text-[#333] tracking-[2px]">
            {t('chat.startOfConversation')}
          </Text>
        </View>
      )}

      {/* Initial loading */}
      {messagesLoading && (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator color="#404040" />
        </View>
      )}

      {/* Load failure — distinct from a genuinely empty conversation so the
          user has a way to recover instead of it silently looking brand-new */}
      {!messagesLoading && messages.length === 0 && messagesError && (
        <View className="items-center py-16 px-8 gap-3">
          <Text className="font-sans text-sm text-[#888] text-center">
            {t('chat.loadError')}
          </Text>
          <Pressable
            onPress={onRetry}
            className="flex-row items-center gap-1.5 py-2 px-4 rounded-[10px] border border-[#2a2a2a]"
          >
            <Text className="font-heading text-[11px] tracking-[2px]" style={{ color: Colors.accent }}>
              {t('chat.retry')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Empty conversation */}
      {!messagesLoading && messages.length === 0 && !messagesError && (
        <View className="items-center py-16 px-8">
          <Text className="font-sans text-sm text-[#484848] text-center">
            {t('chat.sayHello', { name: displayName })}
          </Text>
        </View>
      )}

      {/* Message groups */}
      {groups.map((group) => (
        <View key={group.label}>
          {/* Date divider */}
          <View className="flex-row items-center gap-2.5 mb-1.5 mt-1.5">
            <View className="flex-1 h-px bg-surface" />
            <Text className="font-heading text-[9px] text-[#404040] tracking-[1.5px]">
              {group.label}
            </Text>
            <View className="flex-1 h-px bg-surface" />
          </View>

          {group.msgs.map((msg, i) => {
            const isMe = msg.sender_id === currentUserId;
            const prev = group.msgs[i - 1];
            const next = group.msgs[i + 1];
            const showAvatar = !isMe && prev?.sender_id !== msg.sender_id;
            const isLastInGroup = !next || next.sender_id !== msg.sender_id;

            return (
              <View
                key={msg.id}
                className={`flex-row items-end gap-2 ${
                  isMe ? 'justify-end' : 'justify-start'
                } ${isLastInGroup ? 'mb-2' : 'mb-0.5'}`}
              >
                {!isMe && (
                  showAvatar ? (
                    <ChatAvatar userId={otherUserId ?? ''} name={displayName} size={28} />
                  ) : (
                    <View className="w-7 shrink-0" />
                  )
                )}

                <View className={`max-w-[72%] gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <View
                    className={`py-2.5 px-3.5 ${
                      isMe
                        ? 'bg-accent rounded-[18px] rounded-br-[4px]'
                        : 'bg-[#242424] rounded-[18px] rounded-bl-[4px]'
                    } ${msg.id.startsWith('temp-') ? 'opacity-60' : ''}`}
                  >
                    <Text
                      className={`font-sans text-sm leading-[21px] ${
                        isMe ? 'text-white' : 'text-secondary'
                      }`}
                    >
                      {msg.content}
                    </Text>
                  </View>
                  {isLastInGroup && (
                    <View className={`flex-row items-center gap-1.5 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                      <Text className="font-sans text-[10px] text-[#404040]">
                        {formatMessageTime(msg.created_at)}
                      </Text>
                      {isMe && (
                        <Text className="font-sans text-[10px] text-[#404040]">
                          {msg.read_at ? t('chat.read') : t('chat.sent')}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  messageContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
