import * as z from "zod";

/** Matches the eight shipped mascot shapes in `@rakazo/core`. */
export const BOT_AVATAR_SHAPE_COUNT = 8;

/**
 * 256x256 webp data URLs from Avatar Studio stay well under this. Cap writes so
 * a pasted raw photo cannot bloat every bot list payload.
 */
export const BOT_AVATAR_VALUE_MAX_LENGTH = 200_000;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const CLAVE_EYES = /^clave::eyes_(#[0-9a-fA-F]{6})$/;
const SHAPE_SUFFIX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})::shape_\d+$/;
const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

export type ParsedBotAvatar =
  | { kind: "clave"; eyeColor: string }
  | { kind: "image"; imageUrl: string }
  | { kind: "shape"; color: string; shapeIndex: number }
  | { kind: "color"; color: string }
  | { kind: "other"; raw: string };

export function parseBotAvatarValue(raw: string): ParsedBotAvatar {
  const clave = CLAVE_EYES.exec(raw);
  if (clave) return { kind: "clave", eyeColor: clave[1]!.toUpperCase() };
  if (raw.startsWith("data:image/")) {
    return { kind: "image", imageUrl: raw };
  }
  if (raw.includes("::shape_")) {
    const parts = raw.split("::shape_");
    const color = parts[0] || "#F97316";
    const rawShape = parts[1] ?? "0";
    const parsedShape = /^\d+$/.test(rawShape) ? Number(rawShape) : 0;
    const shapeIndex = Number.isSafeInteger(parsedShape) ? parsedShape % BOT_AVATAR_SHAPE_COUNT : 0;
    return { kind: "shape", color, shapeIndex };
  }
  if (HEX_COLOR.test(raw)) return { kind: "color", color: raw };
  return { kind: "other", raw };
}

/** True for values we persist on `bots.color` (hex, encoded shape, or data image). */
export function isBotAvatarValue(raw: string): boolean {
  if (!raw || raw.length > BOT_AVATAR_VALUE_MAX_LENGTH) return false;
  return (
    CLAVE_EYES.test(raw) || HEX_COLOR.test(raw) || SHAPE_SUFFIX.test(raw) || DATA_IMAGE.test(raw)
  );
}

/** Legacy body colors must not be reinterpreted as eye customization. */
export function encodeClaveAvatar(eyeColor: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(eyeColor)) throw new Error("Invalid eye color");
  return `clave::eyes_${eyeColor.toUpperCase()}`;
}

export const BotAvatarValueSchema = z
  .string()
  .min(1)
  .max(BOT_AVATAR_VALUE_MAX_LENGTH)
  .refine(isBotAvatarValue, { message: "Invalid bot avatar" });
