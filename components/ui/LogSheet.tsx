import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Trophy, MapPin, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { rtlIconFlip } from '@/lib/i18n/rtl';

const SHEET_HEIGHT = Dimensions.get('window').height;

// iOS keeps a Modal's host view mounted until the OS reports the dismissal
// back through onDismiss. If that report never arrives we still have to let
// the parent proceed, or a queued action is stranded and the FAB appears dead.
const DISMISS_CONFIRM_TIMEOUT_MS = 400;

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogPR: () => void;
  onCheckIn: () => void;
  /**
   * Fired once the sheet is fully gone — not when `visible` flips, but when
   * the exit animation has finished AND (on iOS) UIKit has confirmed the
   * modal's view controller is dismissed. The parent chains the next sheet or
   * a navigation off this: presenting a second modal while this one is still
   * up is silently dropped by UIKit and leaves the app untappable.
   * See the note in app/(tabs)/_layout.tsx.
   */
  onClosed?: () => void;
}

export function LogSheet({ visible, onClose, onClosed, onLogPR, onCheckIn }: Props) {
  const { t } = useTranslation('logpr');
  const ACTIONS: { id: string; icon: LucideIcon; label: string; sub: string }[] = [
    { id: 'pr', icon: Trophy, label: t('logSheet.logPr.label'), sub: t('logSheet.logPr.sub') },
    { id: 'checkin', icon: MapPin, label: t('logSheet.checkin.label'), sub: t('logSheet.checkin.sub') },
  ];
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Latest `visible`, readable from an animation callback that may resolve
  // after the prop has already changed again.
  const visibleRef = useRef(visible);
  // `onClosed` read through a ref so the effect below doesn't need it as a
  // dependency (and so a re-render mid-close can't call a stale copy).
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  // Starts true so the initial `visible === false` render isn't treated as a
  // close. Set false on every open, back to true once the close is reported —
  // which guarantees onClosed fires exactly once per open→close cycle.
  const closeReported = useRef(true);
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reportClosed = useCallback(() => {
    clearTimeout(dismissTimeout.current);
    if (closeReported.current) return;
    closeReported.current = true;
    onClosedRef.current?.();
  }, []);

  useEffect(() => () => clearTimeout(dismissTimeout.current), []);

  useEffect(() => {
    visibleRef.current = visible;

    if (visible) {
      closeReported.current = false;
      clearTimeout(dismissTimeout.current);
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
    }

    // Never opened (first render with visible=false) — nothing to tear down.
    if (closeReported.current) return;

    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Deliberately not gated on `finished`: an interrupted exit animation
      // used to leave `mounted` true forever, and a transparent modal that
      // never unmounts is itself enough to make iOS stop accepting touches.
      // The reopen case is handled by re-reading `visible` instead.
      if (visibleRef.current) return;
      setMounted(false);

      if (Platform.OS === 'ios') {
        // Wait for the real dismissal (handleDismiss below); fall back to the
        // timeout so a missed callback can't strand the parent's next step.
        dismissTimeout.current = setTimeout(reportClosed, DISMISS_CONFIRM_TIMEOUT_MS);
      } else {
        // Android has no onDismiss — the Dialog is gone as soon as it unmounts.
        reportClosed();
      }
    });
  }, [visible, translateY, reportClosed]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={reportClosed}
    >
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
              // Only signals intent — the parent closes this sheet first and
              // runs the action once the dismissal is confirmed. Opening the
              // next sheet from here is what froze iOS.
              onPress={() => {
                if (action.id === 'pr') onLogPR();
                else onCheckIn();
              }}
            >
              <View className="w-12 h-12 rounded-[14px] bg-[#1a1a1a] items-center justify-center shrink-0">
                <action.icon size={24} color={Colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-primary mb-0.5">
                  {action.label}
                </Text>
                <Text className="font-sans text-xs text-muted">{action.sub}</Text>
              </View>
              <ChevronRight size={16} color={Colors.hint} style={rtlIconFlip} />
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}
