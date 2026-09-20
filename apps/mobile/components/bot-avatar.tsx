import type { AvatarStyle } from "@rakazo/contracts";
import type { ClaveExpression } from "@rakazo/core";
import {
  ACTIVE_RUN_STATUSES,
  CLAVE_AVATAR_BODY_PATH,
  CLAVE_AVATAR_VIEWBOX,
  CLAVE_EYE,
  claveEyesFrame,
  resolvePersonaColorDef,
} from "@rakazo/core";
import { memo, useEffect } from "react";
import { Image, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Path, Rect } from "react-native-svg";
import { mobileBotAvatarPresentation } from "../lib/bot-avatar";
import { useI18n } from "../lib/i18n";
import { NativeSymbol } from "./native-symbol";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const BotAvatar = memo(function BotAvatar({
  color,
  size = 54,
  status,
  identity,
  expression,
  muted = false,
}: {
  color: string;
  size?: number;
  status?: string;
  identity?: string;
  expression?: ClaveExpression;
  variant?: AvatarStyle;
  muted?: boolean;
}) {
  const { t } = useI18n();
  const isWorking = ACTIVE_RUN_STATUSES.some((activeStatus) => activeStatus === status);
  const parsed = mobileBotAvatarPresentation(color);
  const fillColor = parsed.kind === "shape" || parsed.kind === "color" ? parsed.color : color;
  const colorDef = resolvePersonaColorDef(identity || "agent", fillColor);
  const resolvedExpression = expression ?? (isWorking ? "working" : "neutral");
  const picture =
    parsed.kind === "image" && parsed.imageUrl ? (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
        }}
      >
        <Image source={{ uri: parsed.imageUrl }} style={{ width: size, height: size }} />
      </View>
    ) : (
      <ClaveAvatar
        color={colorDef.hex}
        eyeColor={colorDef.eyeColor}
        expression={resolvedExpression}
        size={size}
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
}: {
  color: string;
  eyeColor: string;
  expression: ClaveExpression;
  size: number;
}) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
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
    if (expression === "working" && !reducedMotion) {
      progress.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
    return () => cancelAnimation(progress);
  }, [expression, progress, reducedMotion]);

  const leftEyeProps = useAnimatedProps(() => {
    const scan = expression === "working" && !reducedMotion ? -4 + progress.value * 8 : 0;
    return { x: leftX + scan };
  });
  const rightEyeProps = useAnimatedProps(() => {
    const scan = expression === "working" && !reducedMotion ? -4 + progress.value * 8 : 0;
    return { x: rightX + scan };
  });

  return (
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
  );
}
