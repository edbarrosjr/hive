import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLAVE_AVATAR_BODY_PATH, CLAVE_EYE } from "./clave-avatar.js";

const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

describe("Clave platform consistency", () => {
  it("keeps web and Android notification silhouettes on the canonical C", () => {
    expect(read("apps/web/public/favicon.svg")).toContain(CLAVE_AVATAR_BODY_PATH);
    expect(
      read(
        "apps/mobile/modules/rakazo-notifications/android/src/main/res/drawable/ic_rakazo_notification.xml",
      ),
    ).toContain(CLAVE_AVATAR_BODY_PATH);
    const native = read("apps/mobile/components/bot-avatar.tsx");
    expect(native).toContain("CLAVE_AVATAR_BODY_PATH");
    expect(native).toContain("claveMotion(expression)");
    expect(native).toContain("darkTokens.mascotBody");
    expect(native).toContain('parsed.kind === "clave" ? parsed.eyeColor');
    expect(native).toContain("!reducedMotion");
  });

  it("uses upright eyes and the C curve in the Kotlin live-status icon", () => {
    const kotlin = read(
      "apps/mobile/modules/rakazo-notifications/android/src/main/java/com/rakazo/notifications/HIVENotificationService.kt",
    );
    expect(kotlin).toContain("quadTo(129f, 20f, 139f, 28f)");
    expect(kotlin).toContain(`canvas.drawRoundRect(${CLAVE_EYE.leftX}f, ${CLAVE_EYE.y}f`);
    expect(kotlin).not.toContain("canvas.rotate(-42f");
  });
});
