import { describe, expect, it } from "vitest";
import {
  BOT_AVATAR_VALUE_MAX_LENGTH,
  BotAvatarValueSchema,
  encodeClaveAvatar,
  isBotAvatarValue,
  parseBotAvatarValue,
  UpdateBotInput,
} from "./index.js";

describe("bot avatar values", () => {
  it("round trips eye customization through the update contract", () => {
    const color = encodeClaveAvatar("#312e81");
    expect(color).toBe("clave::eyes_#312E81");
    expect(parseBotAvatarValue(color)).toEqual({ kind: "clave", eyeColor: "#312E81" });
    expect(UpdateBotInput.safeParse({ botId: "bot-1", color }).success).toBe(true);
    for (const invalid of ["clave::eyes_red", "clave::eyes_#123", "clave::eyes_#123456;url(x)"]) {
      expect(isBotAvatarValue(invalid)).toBe(false);
    }
    expect(() => encodeClaveAvatar("red")).toThrow();
  });
  it("parses hex, encoded shapes, and data images", () => {
    expect(parseBotAvatarValue("#8B5CF6")).toEqual({ kind: "color", color: "#8B5CF6" });
    expect(parseBotAvatarValue("#8B5CF6::shape_3")).toEqual({
      kind: "shape",
      color: "#8B5CF6",
      shapeIndex: 3,
    });
    expect(parseBotAvatarValue("data:image/png;base64,abc")).toEqual({
      kind: "image",
      imageUrl: "data:image/png;base64,abc",
    });
  });

  it("does not treat remote URLs as images", () => {
    expect(parseBotAvatarValue("https://evil.example/track.png")).toEqual({
      kind: "other",
      raw: "https://evil.example/track.png",
    });
    expect(isBotAvatarValue("https://evil.example/track.png")).toBe(false);
  });

  it("accepts persisted writes and rejects oversized or remote values", () => {
    expect(isBotAvatarValue("#3EC5A8")).toBe(true);
    expect(isBotAvatarValue("#8B5CF6::shape_0")).toBe(true);
    expect(isBotAvatarValue("data:image/webp;base64,aGVsbG8=")).toBe(true);
    expect(isBotAvatarValue("#8B5CF6::shape_3junk")).toBe(false);
    expect(
      isBotAvatarValue(`data:image/png;base64,${"A".repeat(BOT_AVATAR_VALUE_MAX_LENGTH)}`),
    ).toBe(false);
    expect(BotAvatarValueSchema.safeParse("#fff").success).toBe(true);
    expect(BotAvatarValueSchema.safeParse("not-a-color").success).toBe(false);
    expect(UpdateBotInput.safeParse({ botId: "bot-1", color: "#8B5CF6::shape_2" }).success).toBe(
      true,
    );
    expect(
      UpdateBotInput.safeParse({ botId: "bot-1", color: "https://evil.example/x.png" }).success,
    ).toBe(false);
    expect(UpdateBotInput.safeParse({ botId: "bot-1", color: "gray" }).success).toBe(false);
    expect(UpdateBotInput.safeParse({ botId: "bot-1", name: "Atlas" }).success).toBe(true);
  });
});
