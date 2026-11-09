import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type LayoutChangeEvent,
} from "react-native";

const FOCUS_MARGIN = 24;

/**
 * How far the Android keyboard covers a full-screen container inside an RN
 * `<Modal>` (react-native-keyboard-controller covers regular screens; this is
 * for the modal sheets). With edge-to-edge on, Android no longer resizes the
 * window when the keyboard opens, so anything pinned to the bottom ends up
 * under it.
 *
 * Attach `onLayout` to the full-screen container and pad the sheet's bottom by
 * `overlap`. `height` is the container's current height. Pass `scrollRef` to
 * also scroll the focused input above the keyboard once the sheet has shrunk.
 *
 * Always 0 on iOS, where `automaticallyAdjustKeyboardInsets` handles it.
 */
export function useKeyboardOverlap(
  initialHeight: number,
  scrollRef?: RefObject<ScrollView | null>
) {
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

  useEffect(() => {
    const scroll = scrollRef?.current;
    if (!scroll || overlap === 0 || keyboardTop == null) return;
    // Wait a frame so the sheet has re-laid out with the new bottom padding.
    const frame = requestAnimationFrame(() => {
      const input = TextInput.State.currentlyFocusedInput();
      if (!input) return;
      input.measureInWindow((_x, inputTop, _w, inputHeight) => {
        if (inputTop + inputHeight + FOCUS_MARGIN <= keyboardTop) return;
        scroll.getNativeScrollRef()?.measureInWindow((_sx, scrollTop) => {
          // RN's helper assumes the ScrollView starts at the top of the
          // screen; the extra offset corrects for the sheet sitting lower.
          scroll.scrollResponderScrollNativeHandleToKeyboard(input, scrollTop + FOCUS_MARGIN, true);
        });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [overlap, keyboardTop, scrollRef]);

  return { overlap, height, onLayout };
}
