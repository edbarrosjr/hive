import { describe, expect, it } from "vitest";
import {
  CLAVE_AVATAR_BODY_PATH,
  CLAVE_AVATAR_VIEWBOX,
  CLAVE_EXPRESSION_FRAMES,
  claveEyesFrame,
} from "./clave-avatar.js";

describe("clave avatar", () => {
  it("ships one stable flat silhouette", () => {
    expect(CLAVE_AVATAR_VIEWBOX).toBe("0 0 256 256");
    expect(CLAVE_AVATAR_BODY_PATH).toMatch(/^M64 32/);
    expect(CLAVE_AVATAR_BODY_PATH).toContain("V148");
    expect(CLAVE_AVATAR_BODY_PATH.endsWith("Z")).toBe(true);
  });

  it("keeps every expression in the eyes", () => {
    expect(Object.keys(CLAVE_EXPRESSION_FRAMES)).toEqual([
      "neutral",
      "listening",
      "thinking",
      "working",
      "success",
      "attention",
    ]);
    expect(claveEyesFrame("working")).toEqual(claveEyesFrame("neutral"));
    expect(claveEyesFrame("attention").leftX).toBeLessThan(0);
    expect(claveEyesFrame("attention").rightX).toBeGreaterThan(0);
  });
});
