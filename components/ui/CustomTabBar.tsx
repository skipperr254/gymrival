import { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { Trophy, Users, Dumbbell, User, Plus, type LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useNotificationStore } from '@/store/useNotificationStore';

// Mirrors the nested stacks' `slide_from_right` push/pop (constants/navigation.ts)
// so the tab bar reads as leaving/arriving with the screen instead of cutting out.
const TAB_BAR_ANIM_DURATION = 300;
const tabBarEntering = SlideInLeft.duration(TAB_BAR_ANIM_DURATION).easing(
  Easing.out(Easing.cubic)
);
const tabBarExiting = SlideOutLeft.duration(TAB_BAR_ANIM_DURATION).easing(
  Easing.in(Easing.cubic)
);

interface Props extends BottomTabBarProps {
  onLogPress: () => void;
}

const TAB_ICONS: Record<string, LucideIcon> = {
  compete: Trophy,
  social: Users,
  train: Dumbbell,
  profile: User,
};

export function CustomTabBar({ state, navigation, onLogPress }: Props) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Skip the entering animation on first mount — only animate on real
  // show/hide transitions triggered by drilling into or out of a nested screen.
  const hasMounted = useRef(false);
  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const tabLabels: Record<string, string> = {
    compete: t('tabs.compete'),
    social: t('tabs.social'),
    train: t('tabs.train'),
    profile: t('tabs.profile'),
  };

  // Each tab is its own nested Stack; once navigation has drilled past that
  // stack's base "index" screen (Friends, Badges, Settings, ...) the nested
  // screen owns the full screen and the back button is the only way out —
  // unmount the tab bar there (animated via tabBarExiting above) instead of
  // leaving it floating under the content.
  const focusedRouteName =
    getFocusedRouteNameFromRoute(state.routes[state.index]) ?? 'index';
  if (focusedRouteName !== 'index') return null;

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
    <Animated.View
      entering={hasMounted.current ? tabBarEntering : undefined}
      exiting={tabBarExiting}
    >
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
    </Animated.View>
  );
}
