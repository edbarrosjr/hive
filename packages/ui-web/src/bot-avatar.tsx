import type { ClaveExpression, GrokColorDef } from "@rakazo/core";
import {
  ACTIVE_RUN_STATUSES,
  CLAVE_AVATAR_BODY_PATH,
  CLAVE_AVATAR_VIEWBOX,
  CLAVE_EYE,
  claveEyesFrame,
  claveMotion,
  claveMotionTransform,
  DEFAULT_GROK_BOT_COLOR,
  GROK_BOT_COLORS,
  GROK_COLOR_LIST,
  parseBotAvatarValue,
  resolvePersonaColorDef,
  SHIPPED_BOT_AVATAR_SHAPE_KEYS,
  SHIPPED_BOT_AVATAR_SHAPES,
} from "@rakazo/core";
import { darkTokens } from "@rakazo/ui-tokens";
import { memo, useEffect, useRef } from "react";
import { cn } from "./lib/utils.js";
import "./styles.css";

export type { ClaveExpression, GrokColorDef };
export { DEFAULT_GROK_BOT_COLOR, GROK_BOT_COLORS, GROK_COLOR_LIST, resolvePersonaColorDef };

/** @deprecated Kept for compatibility with callers that still inspect legacy shapes. */
export const GROK_SHAPES = SHIPPED_BOT_AVATAR_SHAPES;
/** @deprecated Clave is now the only product mascot silhouette. */
export const SHIPPED_SHAPE_KEYS = SHIPPED_BOT_AVATAR_SHAPE_KEYS;
export const GROK_MASCOT_SHAPES = SHIPPED_SHAPE_KEYS.map(() => CLAVE_AVATAR_BODY_PATH);

/**
 * The identity and explicit legacy shape no longer change the product mascot.
 * Keeping this function stable avoids a data migration for existing bots.
 */
export function resolvePersonaShape(_identity: string, _explicitShape?: string | null): string {
  return CLAVE_AVATAR_BODY_PATH;
}

export function parseBotAvatar(
  rawColor: string,
  _identity?: string,
): {
  color: string;
  shapeIndex?: number;
  isImage: boolean;
  imageUrl?: string;
} {
  if (!rawColor) return { color: "#F97316", isImage: false };
  // Only data: image URLs are rendered. Arbitrary http(s)/blob values in `color`
  // must not become <img src> (SSRF / tracking when other members view the bot).
  if (rawColor.startsWith("data:image/")) {
    return { color: "#F97316", isImage: true, imageUrl: rawColor };
  }
  if (rawColor.includes("::shape_")) {
    const parts = rawColor.split("::shape_");
    const rawShapeIdx = parts[1] ?? "0";
    const parsedShapeIdx = /^\d+$/.test(rawShapeIdx) ? Number(rawShapeIdx) : 0;
    const shapeIdx = Number.isSafeInteger(parsedShapeIdx) ? parsedShapeIdx : 0;
    return {
      color: parts[0] || "#F97316",
      shapeIndex: shapeIdx % SHIPPED_SHAPE_KEYS.length,
      isImage: false,
    };
  }
  return { color: rawColor, isImage: false };
}

export interface BotAvatarProps {
  color: string;
  size?: number;
  status?: string;
  identity?: string;
  expression?: ClaveExpression;
  className?: string;
  variant?: unknown;
  /** Disable motion in lists while retaining run status semantics. */
  animate?: boolean;
}

function eyeTransform(side: "left" | "right", expression: ClaveExpression): string {
  const frame = claveEyesFrame(expression);
  const isLeft = side === "left";
  const x = isLeft ? CLAVE_EYE.leftX : CLAVE_EYE.rightX;
  const offsetX = isLeft ? frame.leftX : frame.rightX;
  const offsetY = isLeft ? frame.leftY : frame.rightY;
  const rotation = isLeft ? frame.leftRotation : frame.rightRotation;
  const centerX = x + CLAVE_EYE.width / 2;
  const centerY = CLAVE_EYE.y + CLAVE_EYE.height / 2;
  return [
    `translate(${offsetX} ${offsetY})`,
    `translate(${centerX} ${centerY})`,
    `rotate(${rotation})`,
    `scale(${frame.scaleX} ${frame.scaleY})`,
    `translate(${-centerX} ${-centerY})`,
  ].join(" ");
}

function ClaveEyes({ expression, eyeColor }: { expression: ClaveExpression; eyeColor: string }) {
  return (
    <g className="clave-avatar-eyes" fill={eyeColor} data-expression={expression}>
      <g
        className="clave-avatar-eye clave-avatar-eye-left"
        transform={eyeTransform("left", expression)}
      >
        <rect
          x={CLAVE_EYE.leftX}
          y={CLAVE_EYE.y}
          width={CLAVE_EYE.width}
          height={CLAVE_EYE.height}
          rx={CLAVE_EYE.radius}
        />
      </g>
      <g
        className="clave-avatar-eye clave-avatar-eye-right"
        transform={eyeTransform("right", expression)}
      >
        <rect
          x={CLAVE_EYE.rightX}
          y={CLAVE_EYE.y}
          width={CLAVE_EYE.width}
          height={CLAVE_EYE.height}
          rx={CLAVE_EYE.radius}
        />
      </g>
    </g>
  );
}

export const BotAvatar = memo(function BotAvatar({
  color,
  size = 36,
  status,
  expression,
  className,
  animate = true,
}: BotAvatarProps) {
  const isWorking = ACTIVE_RUN_STATUSES.some((activeStatus) => activeStatus === status);
  const resolvedExpression = expression ?? (isWorking ? "working" : "neutral");
  const parsed = parseBotAvatarValue(color);
  const eyeColor = parsed.kind === "clave" ? parsed.eyeColor : darkTokens.mascotEyes;
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [];
    const sync = () => {
      for (const animation of animations) animation.cancel();
      animations = [];
      const motion = claveMotion(resolvedExpression);
      if (!animate || media.matches || !motion || !root.current) return;
      for (const part of ["body", "left", "right"] as const) {
        const selector = part === "body" ? ".clave-avatar-character" : `.clave-avatar-eye-${part}`;
        const element = root.current.querySelector<SVGElement>(selector);
        if (!element?.animate) continue;
        animations.push(
          element.animate(
            motion.frames.map((frame) => ({
              offset: frame.offset,
              transform: claveMotionTransform(frame, part),
              easing: "cubic-bezier(.4,0,.2,1)",
            })),
            { duration: motion.duration, iterations: motion.iterations },
          ),
        );
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      for (const animation of animations) animation.cancel();
    };
  }, [animate, resolvedExpression]);

  return (
    <div
      ref={root}
      className={cn(
        "rakazo-bot-avatar clave-avatar relative inline-flex items-center justify-center shrink-0 select-none",
        className,
      )}
      style={{ width: size, height: size }}
      data-expression={resolvedExpression}
      data-mascot="clave"
      data-working={isWorking}
    >
      <svg
        viewBox={CLAVE_AVATAR_VIEWBOX}
        width={size}
        height={size}
        aria-hidden="true"
        className="block overflow-visible"
      >
        <g className="clave-avatar-character">
          <path
            className="clave-avatar-body"
            d={CLAVE_AVATAR_BODY_PATH}
            fill={darkTokens.mascotBody}
          />
          <ClaveEyes expression={resolvedExpression} eyeColor={eyeColor} />
        </g>
      </svg>
    </div>
  );
});

/** @deprecated The Avatar Studio now exposes color only. */
export function GrokShapePreview({
  color,
  selected,
  onClick,
}: {
  shapeIndex: number;
  color: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="clave"
      aria-pressed={selected ?? false}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        selected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-popover bg-white/10"
          : "hover:bg-white/5",
      )}
    >
      <BotAvatar color={color} size={32} animate={false} />
    </button>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BotAvatar color="" size={44} animate={false} />
      <span className="font-[Aeonik,ui-sans-serif] text-[28px] tracking-tight text-foreground">
        HIVE
      </span>
    </div>
  );
}
