import type { RefObject } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/types/social';
import { ChatAvatar } from './ChatAvatar';
import { formatDateLabel, formatMessageTime } from './helpers';
import { styles } from './styles';

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
      style={styles.messageArea}
      contentContainerStyle={styles.messageContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={100}
    >
      {/* Older messages loader */}
      {loadingOlderMessages && (
        <ActivityIndicator color="#404040" style={{ marginBottom: 12 }} />
      )}

      {/* "All caught up" hint when no more history */}
      {!hasMoreMessages && messages.length > 0 && (
        <View style={styles.historyEnd}>
          <Text style={styles.historyEndText}>{t('chat.startOfConversation')}</Text>
        </View>
      )}

      {/* Initial loading */}
      {messagesLoading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#404040" />
        </View>
      )}

      {/* Empty conversation */}
      {!messagesLoading && messages.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {t('chat.sayHello', { name: displayName })}
          </Text>
        </View>
      )}

      {/* Message groups */}
      {groups.map((group) => (
        <View key={group.label}>
          {/* Date divider */}
          <View style={styles.dateDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{group.label}</Text>
            <View style={styles.dividerLine} />
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
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowMe : styles.messageRowOther,
                  { marginBottom: isLastInGroup ? 8 : 2 },
                ]}
              >
                {!isMe && (
                  showAvatar ? (
                    <ChatAvatar userId={otherUserId ?? ''} name={displayName} size={28} />
                  ) : (
                    <View style={{ width: 28, flexShrink: 0 }} />
                  )
                )}

                <View style={[styles.bubbleGroup, isMe ? styles.bubbleGroupMe : styles.bubbleGroupOther]}>
                  <View style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                    msg.id.startsWith('temp-') && styles.bubbleSending,
                  ]}>
                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                      {msg.content}
                    </Text>
                  </View>
                  {isLastInGroup && (
                    <View style={[styles.metaRow, isMe && styles.metaRowMe]}>
                      <Text style={styles.bubbleTime}>{formatMessageTime(msg.created_at)}</Text>
                      {isMe && (
                        <Text style={styles.readStatus}>
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
