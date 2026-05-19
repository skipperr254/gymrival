import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ACTIONS: { id: string; icon: IoniconName; label: string; sub: string }[] = [
  { id: 'pr', icon: 'trophy', label: 'Log a PR', sub: 'Record a new personal record' },
  { id: 'meal', icon: 'restaurant', label: 'Log a Meal', sub: 'Add calories & macros' },
  { id: 'weight', icon: 'body', label: 'Log Weight', sub: 'Track your bodyweight' },
  { id: 'checkin', icon: 'location', label: 'Gym Check-in', sub: 'Check in to your gym' },
];

export function LogSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}
          onPress={() => undefined}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>LOG ACTIVITY</Text>

          {ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={onClose}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
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
