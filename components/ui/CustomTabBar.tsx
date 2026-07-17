import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import { useNotificationStore } from '@/store/useNotificationStore';

interface Props extends BottomTabBarProps {
  onLogPress: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  compete: { active: 'trophy', inactive: 'trophy-outline' },
  social: { active: 'people', inactive: 'people-outline' },
  train: { active: 'barbell', inactive: 'barbell-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

export function CustomTabBar({ state, navigation, onLogPress }: Props) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const tabLabels: Record<string, string> = {
    compete: t('tabs.compete'),
    social: t('tabs.social'),
    train: t('tabs.train'),
    profile: t('tabs.profile'),
  };

  const renderTab = (route: (typeof state.routes)[0], globalIndex: number) => {
    const isFocused = state.index === globalIndex;
    const icons = TAB_ICONS[route.name];
    if (!icons) return null;
    const label = tabLabels[route.name].toUpperCase();

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

    const showBadge = route.name === 'profile' && unreadCount > 0;

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={isFocused ? icons.active : icons.inactive}
            size={22}
            color={isFocused ? Colors.primary : Colors.muted}
          />
          {showBadge && <View style={styles.tabBadge} />}
        </View>
        <Text style={[styles.label, isFocused && styles.labelActive]}>
          {label}
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
        accessibilityLabel={t('accessibility.logActivity')}
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
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: '#121212',
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
