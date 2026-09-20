import type { AvatarStyle } from "@rakazo/contracts";
import type { ClaveExpression } from "@rakazo/core";
import {
  ACTIVE_RUN_STATUSES,
  CLAVE_AVATAR_BODY_PATH,
  CLAVE_AVATAR_VIEWBOX,
  CLAVE_EYE,
  claveEyesFrame,
  claveMotion,
  parseBotAvatarValue,
} from "@rakazo/core";
import { darkTokens } from "@rakazo/ui-tokens";
import { memo, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Path, Rect } from "react-native-svg";
import { useI18n } from "../lib/i18n";
import { NativeSymbol } from "./native-symbol";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const BotAvatar = memo(function BotAvatar({
  color,
  size = 54,
  status,
  expression,
  muted = false,
  animate = true,
}: {
  color: string;
  size?: number;
  status?: string;
  identity?: string;
  expression?: ClaveExpression;
  variant?: AvatarStyle;
  muted?: boolean;
  animate?: boolean;
}) {
  const { t } = useI18n();
  const isWorking = ACTIVE_RUN_STATUSES.some((activeStatus) => activeStatus === status);
  const parsed = parseBotAvatarValue(color);
  const eyeColor = parsed.kind === "clave" ? parsed.eyeColor : darkTokens.mascotEyes;
  const resolvedExpression = expression ?? (isWorking ? "working" : "neutral");
  const picture = (
    <ClaveAvatar
      color={darkTokens.mascotBody}
      eyeColor={eyeColor}
      expression={resolvedExpression}
      size={size}
      animate={animate}
    />
  );

  return (
    <View style={{ width: size, height: size }}>
      {picture}
      {isWorking ? (
        <View
          accessibilityLabel={t("Working")}
          style={{
            position: "absolute",
            right: muted ? undefined : 0,
            left: muted ? 0 : undefined,
            bottom: 0,
            width: Math.max(6, Math.round(size * 0.18)),
            height: Math.max(6, Math.round(size * 0.18)),
            borderRadius: size,
            backgroundColor: "#F5A03C",
          }}
        />
      ) : null}
      {muted ? (
        <View
          accessible
          accessibilityLabel={t("Notifications silenced")}
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: Math.max(14, Math.round(size * 0.34)),
            height: Math.max(14, Math.round(size * 0.34)),
            borderRadius: size,
            borderWidth: 2,
            borderColor: "#000",
            backgroundColor: "#242428",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NativeSymbol
            ios="bell.slash.fill"
            android="notifications-off"
            size={Math.max(8, Math.round(size * 0.17))}
            color="#ECECEE"
          />
        </View>
      ) : null}
    </View>
  );
});

function ClaveAvatar({
  color,
  eyeColor,
  expression,
  size,
  animate,
}: {
  color: string;
  eyeColor: string;
  expression: ClaveExpression;
  size: number;
  animate: boolean;
}) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const motion = claveMotion(expression);
  const frames = motion?.frames;
  const offsets = frames?.map((value) => value.offset) ?? [0, 1];
  const values = (
    key:
      | "bodyX"
      | "bodyY"
      | "bodyRotation"
      | "leftX"
      | "leftY"
      | "leftRotation"
      | "leftScaleY"
      | "rightX"
      | "rightY"
      | "rightRotation"
      | "rightScaleY",
  ) => frames?.map((value) => value[key]) ?? [0, 0];
  const bodyX = values("bodyX"),
    bodyY = values("bodyY"),
    bodyRotation = values("bodyRotation");
  const leftMotionX = values("leftX"),
    leftMotionY = values("leftY"),
    leftRotation = values("leftRotation"),
    leftScale = values("leftScaleY");
  const rightMotionX = values("rightX"),
    rightMotionY = values("rightY"),
    rightRotation = values("rightRotation"),
    rightScale = values("rightScaleY");
  const moving = Boolean(motion && animate && !reducedMotion);
  const frame = claveEyesFrame(expression);
  const eyeWidth = CLAVE_EYE.width * frame.scaleX;
  const eyeHeight = CLAVE_EYE.height * frame.scaleY;
  const eyeY = CLAVE_EYE.y + (CLAVE_EYE.height - eyeHeight) / 2;
  const leftX = CLAVE_EYE.leftX + frame.leftX + (CLAVE_EYE.width - eyeWidth) / 2;
  const rightX = CLAVE_EYE.rightX + frame.rightX + (CLAVE_EYE.width - eyeWidth) / 2;
  const leftCenterX = leftX + eyeWidth / 2;
  const rightCenterX = rightX + eyeWidth / 2;
  const leftCenterY = eyeY + frame.leftY + eyeHeight / 2;
  const rightCenterY = eyeY + frame.rightY + eyeHeight / 2;

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    const nextMotion = claveMotion(expression);
    if (nextMotion && animate && !reducedMotion) {
      progress.value = withRepeat(
        withTiming(1, { duration: nextMotion.duration, easing: Easing.linear }),
        nextMotion.iterations === Infinity ? -1 : nextMotion.iterations,
        false,
      );
    }
    return () => cancelAnimation(progress);
  }, [animate, expression, progress, reducedMotion]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: moving ? (interpolate(progress.value, offsets, bodyX) * size) / 256 : 0 },
      { translateY: moving ? (interpolate(progress.value, offsets, bodyY) * size) / 256 : 0 },
      { rotate: `${moving ? interpolate(progress.value, offsets, bodyRotation) : 0}deg` },
    ],
  }));

  const leftEyeProps = useAnimatedProps(() => {
    const x = leftX + (moving ? interpolate(progress.value, offsets, leftMotionX) : 0);
    const height = eyeHeight * (moving ? interpolate(progress.value, offsets, leftScale) : 1);
    const y =
      eyeY +
      frame.leftY +
      (eyeHeight - height) / 2 +
      (moving ? interpolate(progress.value, offsets, leftMotionY) : 0);
    const angle = moving ? interpolate(progress.value, offsets, leftRotation) : frame.leftRotation;
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians),
      sin = Math.sin(radians);
    const cx = x + eyeWidth / 2,
      cy = y + height / 2;
    return {
      x,
      y,
      height,
      matrix: [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy],
    };
  });
  const rightEyeProps = useAnimatedProps(() => {
    const x = rightX + (moving ? interpolate(progress.value, offsets, rightMotionX) : 0);
    const height = eyeHeight * (moving ? interpolate(progress.value, offsets, rightScale) : 1);
    const y =
      eyeY +
      frame.rightY +
      (eyeHeight - height) / 2 +
      (moving ? interpolate(progress.value, offsets, rightMotionY) : 0);
    const angle = moving
      ? interpolate(progress.value, offsets, rightRotation)
      : frame.rightRotation;
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians),
      sin = Math.sin(radians);
    const cx = x + eyeWidth / 2,
      cy = y + height / 2;
    return {
      x,
      y,
      height,
      matrix: [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy],
    };
  });

  return (
    <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
      <Svg width={size} height={size} viewBox={CLAVE_AVATAR_VIEWBOX}>
        <Path d={CLAVE_AVATAR_BODY_PATH} fill={color} />
        <G fill={eyeColor}>
          <AnimatedRect
            animatedProps={leftEyeProps}
            y={eyeY + frame.leftY}
            width={eyeWidth}
            height={eyeHeight}
            rx={Math.min(CLAVE_EYE.radius, eyeWidth / 2)}
            transform={`rotate(${frame.leftRotation} ${leftCenterX} ${leftCenterY})`}
          />
          <AnimatedRect
            animatedProps={rightEyeProps}
            y={eyeY + frame.rightY}
            width={eyeWidth}
            height={eyeHeight}
            rx={Math.min(CLAVE_EYE.radius, eyeWidth / 2)}
            transform={`rotate(${frame.rightRotation} ${rightCenterX} ${rightCenterY})`}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}
