import { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

const SHEET_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogPR: () => void;
  onCheckIn: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export function LogSheet({ visible, onClose, onLogPR, onCheckIn }: Props) {
  const { t } = useTranslation('logpr');
  const ACTIONS: { id: string; icon: IoniconName; label: string; sub: string }[] = [
    { id: 'pr', icon: 'trophy', label: t('logSheet.logPr.label'), sub: t('logSheet.logPr.sub') },
    { id: 'checkin', icon: 'location', label: t('logSheet.checkin.label'), sub: t('logSheet.checkin.sub') },
  ];
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(SHEET_HEIGHT);
      const raf = requestAnimationFrame(() => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }).start();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, translateY]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          className="bg-[#1a1a1a] rounded-t-3xl px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom + 16, 32), transform: [{ translateY }] }}
        >
          <View className="w-10 h-1 rounded-full bg-elevated self-center mb-5" />
          <Text className="font-heading text-[13px] tracking-[3px] text-muted mb-3.5">
            {t('logSheet.title')}
          </Text>

          {ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              className="flex-row items-center gap-3.5 bg-[#222] rounded-2xl py-3.5 px-4 mb-2"
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              onPress={() => {
                onClose();
                if (action.id === 'pr') onLogPR();
                else onCheckIn();
              }}
            >
              <View className="w-12 h-12 rounded-[14px] bg-[#1a1a1a] items-center justify-center shrink-0">
                <Ionicons name={action.icon} size={24} color={Colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-primary mb-0.5">
                  {action.label}
                </Text>
                <Text className="font-sans text-xs text-muted">{action.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.hint} />
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}
