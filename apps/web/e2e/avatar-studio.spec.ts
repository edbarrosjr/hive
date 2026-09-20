import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, signup } from "./helpers";

test("bot settings open the color-only Avatar Studio", async ({ page }, testInfo) => {
  const stamp = Date.now();
  await signup(page, `avatar-studio-${stamp}@rakazo.test`, "password12", "Avatar Studio");
  await completeOnboarding(page);
  await page.goto("/app");
  await page.waitForURL(/\/app\/[^/]+$/);

  await page.getByTestId("bot-settings-trigger").click();
  const settings = page.getByTestId("bot-settings");
  await expect(settings).toBeVisible();

  await settings.getByTestId("avatar-studio-trigger").click();
  const studio = page.getByTestId("avatar-studio");
  await expect(studio).toBeVisible();
  await expect(studio.getByText("Avatar Studio", { exact: true })).toBeVisible();
  await expect(studio.locator('[data-mascot="clave"]')).toBeVisible();
  await expect(studio.getByTestId("avatar-studio-color")).toBeVisible();
  await expect(studio.getByText("Color", { exact: true })).toBeVisible();
  await expect(studio.getByText("Shape", { exact: true })).toHaveCount(0);
  await expect(studio.getByRole("button", { name: "Upload", exact: true })).toHaveCount(0);

  await captureScreenshot(page, testInfo, "avatar-studio-color");
});
