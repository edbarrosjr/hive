import { describe, expect, it } from "vitest";
import {
  attachedImageArtifactIds,
  encodeBotAvatarImage,
  resolveUpdateBotAvatar,
} from "./bot-avatar.js";
import { builtinAgentTools } from "./builtin-tools.js";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

describe("bot avatar encoding", () => {
  it("encodes an attached image as a square webp data URL", async () => {
    const dataUrl = await encodeBotAvatarImage(PNG_1X1);
    expect(dataUrl.startsWith("data:image/webp;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan("data:image/webp;base64,".length);
  });

  it("lists attached image artifact ids in order", () => {
    expect(
      attachedImageArtifactIds([
        { kind: "text", text: "hi" },
        { kind: "image", artifactId: "img-1", mimeType: "image/png", name: "a.png" },
        { kind: "image", artifactId: "img-2", mimeType: "image/jpeg", name: "b.jpg" },
      ]),
    ).toEqual(["img-1", "img-2"]);
  });

  it("resolves hex color writes", async () => {
    await expect(
      resolveUpdateBotAvatar({
        color: "#8B5CF6",
        sourceImageArtifactIds: [],
        loadArtifact: async () => null,
      }),
    ).resolves.toEqual({ color: "clave::eyes_#8B5CF6" });
  });

  it("rejects remote URLs and missing attached images", async () => {
    await expect(
      resolveUpdateBotAvatar({
        color: "https://evil.example/x.png",
        sourceImageArtifactIds: [],
        loadArtifact: async () => null,
      }),
    ).resolves.toMatchObject({ error: expect.stringContaining("hex") });
    await expect(
      resolveUpdateBotAvatar({
        useAttachedImage: true,
        sourceImageArtifactIds: [],
        loadArtifact: async () => null,
      }),
    ).resolves.toEqual({
      error: "Clave has a fixed orange body. Only the eye color can be customized.",
    });
  });

  it("refuses image changes without loading an artifact", async () => {
    const loadArtifact = async (_id: string): Promise<Uint8Array | null> => {
      throw new Error("must not load images");
    };
    const fromId = await resolveUpdateBotAvatar({
      artifactId: "img-2",
      sourceImageArtifactIds: ["img-1", "img-2"],
      loadArtifact,
    });
    expect(fromId).toHaveProperty("error");

    const fromLatest = await resolveUpdateBotAvatar({
      useAttachedImage: true,
      sourceImageArtifactIds: ["img-1", "img-2"],
      loadArtifact,
    });
    expect(fromLatest).toHaveProperty("error");

    await expect(
      resolveUpdateBotAvatar({
        artifactId: "other-space",
        sourceImageArtifactIds: ["img-2"],
        loadArtifact,
      }),
    ).resolves.toEqual({
      error: "Clave has a fixed orange body. Only the eye color can be customized.",
    });
  });
});

describe("update_bot tool schema", () => {
  it("exposes avatar and notifyOnFinish fields the executor applies", () => {
    const tool = builtinAgentTools.find((entry) => entry.name === "update_bot");
    if (!tool) throw new Error("missing update_bot");
    const properties =
      (tool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(properties).sort()).toEqual([
      "artifact_id",
      "color",
      "description",
      "name",
      "notifyOnFinish",
      "title",
      "use_attached_image",
    ]);
  });
});
