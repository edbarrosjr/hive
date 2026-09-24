import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("closed registration offers sign-in only", async ({ page }, testInfo) => {
  await page.route("**/api/auth/get-session**", (route) => route.fulfill({ json: null }));
  await page.route("**/api/auth/capabilities", (route) =>
    route.fulfill({ json: { signups: false, passwordReset: false, resetUrl: null } }),
  );

  await page.goto("/");
  await expect(page.locator('[data-rakazo-surface="welcome"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign up/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await captureScreenshot(page, testInfo, "closed-signups-welcome");

  await page.getByRole("button", { name: /Sign in/ }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in to HIVE" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveCount(0);
  await captureScreenshot(page, testInfo, "closed-signups-sign-in");

  await page.goto("/sign-up");
  await page.waitForURL((url) => url.pathname === "/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to HIVE" })).toBeVisible();
});
