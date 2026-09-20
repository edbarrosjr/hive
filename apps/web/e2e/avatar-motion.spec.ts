import { expect, test } from "@playwright/test";

test("bot avatar eyes stay still when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/e2e/fixtures/avatar-motion.html");

  const avatar = page.locator(".rakazo-bot-avatar");
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute("data-working", "true");

  const eyes = avatar.locator(".clave-avatar-eyes");
  await expect(eyes).toBeVisible();
  const snapshot = () =>
    eyes.evaluate((el: SVGElement) => ({
      animationName: getComputedStyle(el).animationName,
      transform: getComputedStyle(el).transform,
    }));
  const first = await snapshot();
  await page.waitForTimeout(300);
  const second = await snapshot();

  expect(first.animationName).toBe("none");
  expect(second).toEqual(first);
});
