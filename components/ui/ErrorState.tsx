import { View, Text, Pressable } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export interface ErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

/** Shared "load failed" block for list/feed screens — distinguishes a network
 * error from a genuinely empty result, which otherwise render identically. */
export function ErrorState({ message, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
      <View className="w-14 h-14 rounded-full bg-[rgba(230,48,48,0.1)] items-center justify-center mb-3.5">
        <AlertCircle size={24} strokeWidth={1.5} color={Colors.accent} />
      </View>
      <Text className="font-sans text-[13px] text-[#999] text-center mb-[18px]">{message}</Text>
      <Pressable onPress={onRetry} className="bg-accent rounded-[10px] py-2.5 px-5">
        <Text className="font-heading text-[11px] tracking-[2px] text-white">{retryLabel}</Text>
      </Pressable>
    </View>
  );
}
