import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { Message } from '@/types/social';
import { ChatAvatar } from './ChatAvatar';
import { formatDateLabel, formatMessageTime } from './helpers';

/**
 * Flattened, inverted-order row model. The list is a virtualized inverted
 * FlatList (index 0 = newest message = visual bottom), which gives chat its
 * standard behaviors for free: opens at the bottom, stays pinned to the
 * bottom when a new message arrives, and only mounts the rows on screen —
 * the previous ScrollView kept every loaded message (50 more per
 * "load older") permanently mounted and re-rendered them all on any parent
 * state change.
 */
type Row =
  | { key: string; type: 'divider'; label: string }
  | {
      key: string;
      type: 'message';
      msg: Message;
      showAvatar: boolean;
      isLastInGroup: boolean;
    };

function buildRows(messages: Message[]): Row[] {
  const labels = messages.map((m) => formatDateLabel(m.created_at));
  const rows: Row[] = [];
  let prevInGroup: Message | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (i === 0 || labels[i] !== labels[i - 1]) {
      rows.push({ key: `divider-${msg.id}`, type: 'divider', label: labels[i] });
      prevInGroup = null;
    }
    const next = i + 1 < messages.length && labels[i + 1] === labels[i] ? messages[i + 1] : null;
    rows.push({
      key: msg.id,
      type: 'message',
      msg,
      showAvatar: prevInGroup?.sender_id !== msg.sender_id,
      isLastInGroup: !next || next.sender_id !== msg.sender_id,
    });
    prevInGroup = msg;
  }

  // Inverted list renders index 0 at the visual bottom
  rows.reverse();
  return rows;
}

const DateDivider = React.memo(function DateDivider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-2.5 mb-1.5 mt-1.5">
      <View className="flex-1 h-px bg-surface" />
      <Text className="font-heading text-[9px] text-[#404040] tracking-[1.5px]">{label}</Text>
      <View className="flex-1 h-px bg-surface" />
    </View>
  );
});

interface MessageRowProps {
  msg: Message;
  isMe: boolean;
  showAvatar: boolean;
  isLastInGroup: boolean;
  otherUserId: string;
  displayName: string;
}

/**
 * Memoized so appending a message (all row wrappers get new identities, but
 * `msg` references are stable in the store) re-renders only the new row and
 * the previous tail row whose isLastInGroup flag flipped.
 */
const MessageRow = React.memo(function MessageRow({
  msg,
  isMe,
  showAvatar,
  isLastInGroup,
  otherUserId,
  displayName,
}: MessageRowProps) {
  const { t } = useTranslation('social');
  return (
    <View
      className={`flex-row items-end gap-2 ${
        isMe ? 'justify-end' : 'justify-start'
      } ${isLastInGroup ? 'mb-2' : 'mb-0.5'}`}
    >
      {!isMe &&
        (showAvatar ? (
          <ChatAvatar userId={otherUserId} name={displayName} size={28} />
        ) : (
          <View className="w-7 shrink-0" />
        ))}

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
});

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
  /** Called when the user scrolls near the visual top (list end, inverted). */
  onLoadOlder: () => void;
}

function MessageListInner({
  messages,
  currentUserId,
  otherUserId,
  displayName,
  loadingOlderMessages,
  hasMoreMessages,
  messagesLoading,
  messagesError,
  onRetry,
  onLoadOlder,
}: MessageListProps) {
  const { t } = useTranslation('social');

  const rows = useMemo(() => buildRows(messages), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) =>
      item.type === 'divider' ? (
        <DateDivider label={item.label} />
      ) : (
        <MessageRow
          msg={item.msg}
          isMe={item.msg.sender_id === currentUserId}
          showAvatar={item.showAvatar}
          isLastInGroup={item.isLastInGroup}
          otherUserId={otherUserId}
          displayName={displayName}
        />
      ),
    [currentUserId, otherUserId, displayName]
  );

  // Empty/loading/error states are rendered outside the FlatList: an
  // inverted list's ListEmptyComponent renders through the inversion
  // transform, and there is nothing to virtualize anyway.
  if (messagesLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator color="#404040" />
      </View>
    );
  }

  if (messages.length === 0) {
    return messagesError ? (
      <View className="flex-1">
        <View className="items-center py-16 px-8 gap-3">
          <Text className="font-sans text-sm text-[#888] text-center">
            {t('chat.loadError')}
          </Text>
          <Pressable
            onPress={onRetry}
            className="flex-row items-center gap-1.5 py-2 px-4 rounded-[10px] border border-[#2a2a2a]"
          >
            <Text
              className="font-heading text-[11px] tracking-[2px]"
              style={{ color: Colors.accent }}
            >
              {t('chat.retry')}
            </Text>
          </Pressable>
        </View>
      </View>
    ) : (
      <View className="flex-1">
        <View className="items-center py-16 px-8">
          <Text className="font-sans text-sm text-[#484848] text-center">
            {t('chat.sayHello', { name: displayName })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderItem}
      inverted
      className="flex-1"
      // Inverted: paddingTop here is the visual bottom, paddingBottom the top
      contentContainerStyle={styles.messageContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onEndReached={hasMoreMessages ? onLoadOlder : undefined}
      onEndReachedThreshold={0.4}
      windowSize={7}
      maxToRenderPerBatch={12}
      initialNumToRender={20}
      ListFooterComponent={
        loadingOlderMessages ? (
          <ActivityIndicator color="#404040" style={styles.olderSpinner} />
        ) : !hasMoreMessages ? (
          <View className="flex-row items-center gap-2.5 mb-2">
            <Text className="font-heading text-[9px] text-[#333] tracking-[2px]">
              {t('chat.startOfConversation')}
            </Text>
          </View>
        ) : null
      }
    />
  );
}

/**
 * Memoized: with the input bar extracted to its own component, typing no
 * longer re-renders the message area at all; message-store updates re-render
 * only the rows that changed (see MessageRow).
 */
export const MessageList = React.memo(MessageListInner);

const styles = StyleSheet.create({
  messageContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  olderSpinner: { marginBottom: 12 },
});
