import { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/theme';

const SHEET_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogPR: () => void;
  onCheckIn: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ACTIONS: { id: string; icon: IoniconName; label: string; sub: string }[] = [
  { id: 'pr', icon: 'trophy', label: 'Log a PR', sub: 'Record a new personal record' },
  { id: 'checkin', icon: 'location', label: 'Gym Check-in', sub: 'Check in to your gym' },
];

export function LogSheet({ visible, onClose, onLogPR, onCheckIn }: Props) {
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
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom + 16, 32), transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>LOG ACTIVITY</Text>

          {ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                onClose();
                if (action.id === 'pr') onLogPR();
                else onCheckIn();
              }}
            >
              <View style={styles.iconBox}>
                <Ionicons name={action.icon} size={24} color={Colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{action.label}</Text>
                <Text style={styles.rowSub}>{action.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.hint} />
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.elevated,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 3,
    color: Colors.muted,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#222',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 2,
  },
  rowSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
});
