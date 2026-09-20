import { describe, expect, it } from "vitest";
import {
  CLAVE_AVATAR_BODY_PATH,
  CLAVE_AVATAR_VIEWBOX,
  CLAVE_EXPRESSION_FRAMES,
  CLAVE_EYE,
  claveEyesFrame,
  claveMotion,
  claveMotionTransform,
} from "./clave-avatar.js";

describe("clave avatar", () => {
  it("ships one stable flat silhouette", () => {
    expect(CLAVE_AVATAR_VIEWBOX).toBe("0 0 256 256");
    expect(CLAVE_AVATAR_BODY_PATH).toMatch(/^M119 28/);
    expect(CLAVE_AVATAR_BODY_PATH).not.toContain("V148");
    expect(CLAVE_EYE.rotation).toBe(0);
    expect(CLAVE_AVATAR_BODY_PATH.endsWith("Z")).toBe(true);
  });

  it("supports semantic expressions with neutral upright eyes", () => {
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

  it("shares rigid body movement and returns exactly to neutral", () => {
    const motion = claveMotion("thinking")!;
    expect(motion).toEqual(claveMotion("working"));
    expect(motion.duration).toBe(5400);
    expect(motion.frames.some((frame) => Math.abs(frame.bodyRotation) >= 6)).toBe(true);
    const { offset: firstOffset, ...first } = motion.frames[0]!;
    const { offset: lastOffset, ...last } = motion.frames.at(-1)!;
    expect(firstOffset).toBe(0);
    expect(lastOffset).toBe(1);
    expect(last).toEqual(first);
    for (const frame of motion.frames)
      expect(claveMotionTransform(frame, "body")).not.toContain("scale");
    expect(claveMotion("neutral")).toBeNull();
    expect(claveMotion("success")?.iterations).toBe(1);
  });
});
