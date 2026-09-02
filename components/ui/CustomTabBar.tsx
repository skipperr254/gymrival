import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Trophy, Users, Dumbbell, User, Plus, type LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useNotificationStore } from '@/store/useNotificationStore';

interface Props extends BottomTabBarProps {
  onLogPress: () => void;
}

const TAB_ICONS: Record<string, LucideIcon> = {
  compete: Trophy,
  social: Users,
  train: Dumbbell,
  profile: User,
};

// Every drill-down screen (chat, challenge detail, settings, ...) lives in
// the root-level `(stack)` group, a sibling of the Tabs navigator — not
// nested inside any one tab's own stack. So this bar never needs to hide
// itself in JS: when one of those screens is pushed, the native-stack
// transition covers the ENTIRE tab navigator (this bar included) as part of
// its own transaction, the same way iOS's `hidesBottomBarWhenPushed` works.
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
    const TabIcon = TAB_ICONS[route.name];
    if (!TabIcon) return null;
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
        className="flex-1 items-center px-1 pt-0.5 gap-[3px]"
        style={({ pressed }) => pressed && { opacity: 0.6 }}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        <View className="relative items-center justify-center">
          <TabIcon
            size={22}
            strokeWidth={isFocused ? 2.2 : 1.8}
            color={isFocused ? Colors.primary : Colors.muted}
            fill={isFocused ? Colors.primary : 'none'}
          />
          {showBadge && (
            <View className="absolute top-[-1px] right-[-4px] w-2 h-2 rounded-full bg-accent border-[1.5px] border-[#121212]" />
          )}
        </View>
        <Text
          className={`font-heading text-[9px] tracking-[1px] ${
            isFocused ? 'text-accent' : 'text-hint'
          }`}
        >
          {label}
        </Text>
        {isFocused && <View className="w-1 h-1 rounded-full bg-accent -mt-px" />}
      </Pressable>
    );
  };

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  return (
    <View
      className="flex-row items-start justify-around bg-[#121212] pt-2.5"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.borderDefault,
      }}
    >
      {leftRoutes.map((route, i) => renderTab(route, i))}

      <Pressable
        onPress={onLogPress}
        className="w-[52px] h-[52px] rounded-full items-center justify-center -mt-4 shrink-0 bg-accent"
        style={({ pressed }) => [
          {
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 8,
          },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('accessibility.logActivity')}
      >
        <Plus size={28} strokeWidth={2.4} color={Colors.primary} />
      </Pressable>

      {rightRoutes.map((route, i) => renderTab(route, i + 2))}
    </View>
  );
}
