import type { ComponentProps, ComponentType } from 'react';
import { KeyboardAwareScrollView as BaseKeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { styled } from 'nativewind';

type Props = ComponentProps<typeof BaseKeyboardAwareScrollView> & {
  className?: string;
  contentContainerClassName?: string;
};

/**
 * react-native-keyboard-controller's KeyboardAwareScrollView, registered with
 * NativeWind so it takes `className` / `contentContainerClassName` like a core
 * ScrollView. Import this one, not the library's, in screens.
 */
export const KeyboardAwareScrollView: ComponentType<Props> = styled(BaseKeyboardAwareScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
