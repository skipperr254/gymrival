import { useCallback, useEffect, useState } from "react";
import { Keyboard, Platform, type LayoutChangeEvent } from "react-native";

/**
 * How far the Android keyboard covers a full-screen container (e.g. a Modal's
 * root view). With edge-to-edge on, Android no longer resizes the window when
 * the keyboard opens, so anything pinned to the bottom ends up under it.
 *
 * Attach `onLayout` to the full-screen container. `overlap` is the number of
 * pixels the keyboard covers (0 when it's closed, or when the window did
 * resize after all). `height` is the container's current height.
 *
 * Always 0 on iOS, where `automaticallyAdjustKeyboardInsets` handles it.
 */
export function useKeyboardOverlap(initialHeight: number) {
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardTop(e.endCoordinates.screenY)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setHeight(e.nativeEvent.layout.height);
  }, []);

  const overlap = keyboardTop == null ? 0 : Math.max(0, height - keyboardTop);
  return { overlap, height, onLayout };
}
