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
  expect(
    await avatar.locator(".clave-avatar-character").evaluate((el) => el.getAnimations().length),
  ).toBe(0);
});

test("C moves its body while working and preserves its geometry", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/fixtures/avatar-motion.html");
  const body = page.locator(".clave-avatar-character");
  await expect(body).toBeVisible();
  await expect.poll(() => body.evaluate((el) => el.getAnimations().length)).toBe(1);
  const path = await page.locator(".clave-avatar-body").getAttribute("d");
  const before = await body.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(1100);
  expect(await body.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
  await expect(page.locator(".clave-avatar-body")).toHaveAttribute("d", path!);
  await expect(page.locator(".clave-avatar-body")).toHaveAttribute("fill", "#F97316");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => body.evaluate((el) => el.getAnimations().length)).toBe(0);
});
