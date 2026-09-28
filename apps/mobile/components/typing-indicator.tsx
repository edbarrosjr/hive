import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useMobileTokens } from "../lib/native";

const DOT_PERIOD_MS = 900;

function Dot({ delay, animate }: { delay: number; animate: boolean }) {
  const tokens = useMobileTokens();
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    if (!animate) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DOT_PERIOD_MS / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: DOT_PERIOD_MS / 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [animate, delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width: 9, height: 9, borderRadius: 5, backgroundColor: tokens.mutedForeground },
        style,
      ]}
    />
  );
}

/** The "…" bubble shown in place of a reply while the bot works. */
export function TypingIndicator({ accessibilityLabel }: { accessibilityLabel: string }) {
  const tokens = useMobileTokens();
  const animate = !useReducedMotion();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: 24,
        backgroundColor: tokens.secondary,
      }}
    >
      <Dot delay={0} animate={animate} />
      <Dot delay={DOT_PERIOD_MS / 3} animate={animate} />
      <Dot delay={(2 * DOT_PERIOD_MS) / 3} animate={animate} />
    </View>
  );
}
