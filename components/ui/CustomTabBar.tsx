import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
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
        className="flex-1 items-center px-1 pt-0.5 gap-[3px]"
        style={({ pressed }) => pressed && { opacity: 0.6 }}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        <View className="relative items-center justify-center">
          <Ionicons
            name={isFocused ? icons.active : icons.inactive}
            size={22}
            color={isFocused ? Colors.primary : Colors.muted}
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
        <Ionicons name="add" size={28} color={Colors.primary} />
      </Pressable>

      {rightRoutes.map((route, i) => renderTab(route, i + 2))}
    </View>
  );
}
