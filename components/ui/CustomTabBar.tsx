import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/theme';

interface Props extends BottomTabBarProps {
  onLogPress: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; active: IoniconName; inactive: IoniconName }> = {
  compete: { label: 'COMPETE', active: 'trophy', inactive: 'trophy-outline' },
  social: { label: 'SOCIAL', active: 'people', inactive: 'people-outline' },
  train: { label: 'TRAIN', active: 'barbell', inactive: 'barbell-outline' },
  profile: { label: 'PROFILE', active: 'person', inactive: 'person-outline' },
};

export function CustomTabBar({ state, navigation, onLogPress }: Props) {
  const insets = useSafeAreaInsets();

  const renderTab = (route: (typeof state.routes)[0], globalIndex: number) => {
    const isFocused = state.index === globalIndex;
    const config = TAB_CONFIG[route.name];
    if (!config) return null;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.dispatch(TabActions.jumpTo(route.name));
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={config.label}
      >
        <Ionicons
          name={isFocused ? config.active : config.inactive}
          size={22}
          color={isFocused ? Colors.primary : Colors.muted}
        />
        <Text style={[styles.label, isFocused && styles.labelActive]}>
          {config.label}
        </Text>
        {isFocused && <View style={styles.dot} />}
      </Pressable>
    );
  };

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {leftRoutes.map((route, i) => renderTab(route, i))}

      <Pressable
        onPress={onLogPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="Log activity"
      >
        <Ionicons name="add" size={28} color={Colors.primary} />
      </Pressable>

      {rightRoutes.map((route, i) => renderTab(route, i + 2))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    backgroundColor: '#121212',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2a',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 2,
    gap: 3,
  },
  tabPressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.hint,
  },
  labelActive: {
    color: Colors.accent,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginTop: -1,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    flexShrink: 0,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.8,
  },
});
