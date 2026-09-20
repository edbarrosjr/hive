import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, signup } from "./helpers";

test("bot settings customize eyes while keeping the C body orange", async ({ page }, testInfo) => {
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
  await expect(studio.getByText("Eye color", { exact: true })).toBeVisible();
  const body = studio.locator(".clave-avatar-body");
  const originalPath = await body.getAttribute("d");
  await expect(body).toHaveAttribute("fill", "#F97316");
  const saved = page.waitForResponse(
    (response) => response.url().includes("/rpc/bots/update") && response.ok(),
  );
  await studio.getByRole("button", { name: "Eye color #312E81", exact: true }).click();
  await saved;
  await expect(studio.locator(".clave-avatar-eyes")).toHaveAttribute("fill", "#312E81");
  await expect(body).toHaveAttribute("d", originalPath!);
  await expect(body).toHaveAttribute("fill", "#F97316");
  await expect(studio.getByText("Shape", { exact: true })).toHaveCount(0);
  await expect(studio.getByRole("button", { name: "Upload", exact: true })).toHaveCount(0);

  await captureScreenshot(page, testInfo, "avatar-studio-color");
  await studio.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await page.getByTestId("bot-settings-trigger").click();
  await page.getByTestId("bot-settings").getByTestId("avatar-studio-trigger").click();
  await expect(page.getByTestId("avatar-studio").locator(".clave-avatar-eyes")).toHaveAttribute(
    "fill",
    "#312E81",
  );
  await expect(page.getByTestId("avatar-studio").locator(".clave-avatar-body")).toHaveAttribute(
    "fill",
    "#F97316",
  );
});
