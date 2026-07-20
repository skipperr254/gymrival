import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

const draftKey = (otherUserId: string) => `gymrival:chatDraft:${otherUserId}`;

interface ChatInputBarProps {
  /** Used for the draft-persistence storage key. */
  otherUserId: string;
  placeholder: string;
  /** False until the conversation id is resolved — send stays disabled. */
  canSend: boolean;
  /** Bottom padding (safe-area aware, computed by the screen). */
  bottomPad: number;
  onSend: (text: string) => void;
}

/**
 * Quick replies + composer. Owns the input state so typing re-renders only
 * this component — previously the draft lived on the chat screen, so every
 * keystroke re-rendered the entire message list above it.
 */
function ChatInputBarInner({
  otherUserId,
  placeholder,
  canSend,
  bottomPad,
  onSend,
}: ChatInputBarProps) {
  const { t } = useTranslation('social');
  const QUICK_REPLIES = t('chat.quickReplies', { returnObjects: true }) as string[];

  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Draft persistence — survives the app being killed mid-compose ────────

  useEffect(() => {
    if (!otherUserId) return;
    AsyncStorage.getItem(draftKey(otherUserId)).then((saved) => {
      if (saved) setInput(saved);
    });
  }, [otherUserId]);

  useEffect(() => {
    if (!otherUserId) return;
    clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      if (input.trim()) {
        AsyncStorage.setItem(draftKey(otherUserId), input).catch(() => {});
      } else {
        AsyncStorage.removeItem(draftKey(otherUserId)).catch(() => {});
      }
    }, 400);
    return () => clearTimeout(draftSaveTimer.current);
  }, [input, otherUserId]);

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !canSend) return;
    onSend(msg);
    setInput('');
    if (otherUserId) AsyncStorage.removeItem(draftKey(otherUserId)).catch(() => {});
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Quick Replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0 pb-2"
        contentContainerStyle={styles.quickContent}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_REPLIES.map((q, i) => (
          <Pressable
            key={i}
            onPress={() => handleSend(q)}
            className="py-1.5 px-3.5 rounded-full border border-[#2a2a2a] bg-[#1c1c1c]"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text className="font-sans text-xs text-[#888]">{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input bar */}
      <View className="flex-row items-end gap-2 px-4 pt-2.5" style={{ paddingBottom: bottomPad }}>
        <View className="flex-1 flex-row items-end bg-[#1c1c1c] border-[1.5px] border-[#2a2a2a] rounded-[22px] pl-4 pr-1 py-1">
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            placeholder={placeholder}
            placeholderTextColor={Colors.hint}
            className="flex-1 font-sans text-sm text-white py-2.5 max-h-[120px]"
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || !canSend}
            className={`w-[34px] h-[34px] rounded-full items-center justify-center shrink-0 mb-0.5 ${
              input.trim() && canSend ? 'bg-accent' : 'bg-[#242424]'
            }`}
          >
            <ArrowUp
              size={16}
              strokeWidth={2.5}
              color={input.trim() && canSend ? '#fff' : '#404040'}
            />
          </Pressable>
        </View>
      </View>
    </>
  );
}

export const ChatInputBar = React.memo(ChatInputBarInner);

const styles = StyleSheet.create({
  quickContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 7,
  },
});
