import type { MessageBlock } from "@rakazo/contracts";
import {
  BOT_AVATAR_VALUE_MAX_LENGTH,
  encodeClaveAvatar,
  parseBotAvatarValue,
} from "@rakazo/contracts";

export const BOT_AVATAR_ENCODE_SIZE = 256;

export function attachedImageArtifactIds(blocks: MessageBlock[] | undefined): string[] {
  if (!blocks?.length) return [];
  return blocks
    .filter((block): block is Extract<MessageBlock, { kind: "image" }> => block.kind === "image")
    .map((block) => block.artifactId);
}

export async function encodeBotAvatarImage(bytes: Uint8Array): Promise<string> {
  const { default: sharp } = await import("sharp");
  const webp = await sharp(bytes)
    .rotate()
    .resize(BOT_AVATAR_ENCODE_SIZE, BOT_AVATAR_ENCODE_SIZE, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 90 })
    .toBuffer();
  const dataUrl = `data:image/webp;base64,${webp.toString("base64")}`;
  if (dataUrl.length > BOT_AVATAR_VALUE_MAX_LENGTH) {
    throw new Error("Avatar image is too large");
  }
  return dataUrl;
}

export async function resolveUpdateBotAvatar(input: {
  color?: unknown;
  artifactId?: unknown;
  useAttachedImage?: unknown;
  sourceImageArtifactIds: readonly string[];
  loadArtifact: (id: string) => Promise<Uint8Array | null>;
}): Promise<{ color: string } | { error: string }> {
  const artifactId =
    typeof input.artifactId === "string" && input.artifactId.trim()
      ? input.artifactId.trim()
      : undefined;
  const useAttachedImage = input.useAttachedImage === true;
  const color = typeof input.color === "string" ? input.color.trim() : undefined;

  if (artifactId || useAttachedImage) {
    return { error: "Clave has a fixed orange body. Only the eye color can be customized." };
  }

  if (color !== undefined) {
    const parsed = parseBotAvatarValue(color);
    if (parsed.kind === "clave") return { color: encodeClaveAvatar(parsed.eyeColor) };
    if (parsed.kind === "color") {
      const hex =
        parsed.color.length === 4
          ? `#${parsed.color
              .slice(1)
              .split("")
              .map((c) => c + c)
              .join("")}`
          : parsed.color;
      return { color: encodeClaveAvatar(hex) };
    }
    return {
      error: "color must be a hex eye color or clave::eyes_#RRGGBB. The body is fixed orange.",
    };
  }

  return { error: "missing" };
}
