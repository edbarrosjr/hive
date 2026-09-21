import { expect, test } from "@playwright/test";
import { darkTokens } from "@rakazo/ui-tokens";
import { captureScreenshot } from "./helpers";

test("welcome and signup share the orange mascot on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.route("**/api/auth/get-session**", (route) => route.fulfill({ json: null }));
  await page.route("**/api/auth/capabilities", (route) =>
    route.fulfill({ json: { passwordReset: false, resetUrl: null } }),
  );

  await page.goto("/");
  const welcomeMascot = page.locator('[data-rakazo-surface="welcome"] [data-mascot="clave"]');
  await expect(welcomeMascot).toBeVisible();
  await expect(welcomeMascot.locator(".clave-avatar-body")).toHaveAttribute(
    "fill",
    darkTokens.mascotBody,
  );
  const silhouette = await welcomeMascot.locator(".clave-avatar-body").getAttribute("d");
  await captureScreenshot(page, testInfo, "clave-welcome-mobile");

  await page.getByRole("button", { name: /Sign up/ }).click();
  await expect(page.getByRole("heading", { name: "Create your HIVE" })).toBeVisible();
  const authMascot = page.locator('form [data-mascot="clave"]');
  await expect(authMascot).toBeVisible();
  await expect(authMascot.locator(".clave-avatar-body")).toHaveAttribute("d", silhouette!);
  await expect(authMascot.locator(".clave-avatar-body")).toHaveAttribute(
    "fill",
    darkTokens.mascotBody,
  );
  await expect(authMascot.locator(".clave-avatar-eyes")).toHaveAttribute(
    "fill",
    darkTokens.mascotEyes,
  );
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
  await captureScreenshot(page, testInfo, "clave-signup-mobile");
});
