import type { ClaveExpression, GrokColorDef } from "@rakazo/core";
import {
  ACTIVE_RUN_STATUSES,
  CLAVE_AVATAR_BODY_PATH,
  CLAVE_AVATAR_VIEWBOX,
  CLAVE_EYE,
  claveEyesFrame,
  DEFAULT_GROK_BOT_COLOR,
  GROK_BOT_COLORS,
  GROK_COLOR_LIST,
  resolvePersonaColorDef,
  SHIPPED_BOT_AVATAR_SHAPE_KEYS,
  SHIPPED_BOT_AVATAR_SHAPES,
} from "@rakazo/core";
import { memo, useMemo } from "react";
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
  identity = "",
  expression,
  className,
}: BotAvatarProps) {
  const isWorking = ACTIVE_RUN_STATUSES.some((activeStatus) => activeStatus === status);
  const resolvedExpression = expression ?? (isWorking ? "working" : "neutral");
  const parsed = useMemo(() => parseBotAvatar(color, identity), [color, identity]);
  const effectiveId = identity || parsed.color || "agent";
  const colorDef = useMemo(
    () => resolvePersonaColorDef(effectiveId, parsed.color),
    [effectiveId, parsed.color],
  );

  if (parsed.isImage && parsed.imageUrl) {
    return (
      <div
        className={cn(
          "rakazo-bot-avatar relative overflow-hidden rounded-full flex items-center justify-center select-none bg-secondary shrink-0 border border-border",
          className,
        )}
        data-working={isWorking}
        style={{ width: size, height: size }}
      >
        <img src={parsed.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
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
        <path className="clave-avatar-body" d={CLAVE_AVATAR_BODY_PATH} fill={colorDef.hex} />
        <ClaveEyes expression={resolvedExpression} eyeColor={colorDef.eyeColor} />
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
  const colorDef = resolvePersonaColorDef("preview", color);
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
      <svg viewBox={CLAVE_AVATAR_VIEWBOX} className="size-8 overflow-visible" aria-hidden="true">
        <path d={CLAVE_AVATAR_BODY_PATH} fill={colorDef.hex} />
        <ClaveEyes expression="neutral" eyeColor={colorDef.eyeColor} />
      </svg>
    </button>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-11 w-11 items-center justify-center gap-1.5 rounded-full bg-card">
        <span className="h-4 w-[7px] rounded-full bg-primary" />
        <span className="h-4 w-[7px] rounded-full bg-primary" />
      </div>
      <span className="font-[Aeonik,ui-sans-serif] text-[28px] tracking-tight text-foreground">
        HIVE
      </span>
    </div>
  );
}
