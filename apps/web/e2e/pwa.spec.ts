import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("web app is installable: manifest, icons and service worker are served", async ({
  page,
}, testInfo) => {
  const manifestResponse = await page.request.get("/site.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(
    true,
  );
  for (const icon of manifest.icons as Array<{ src: string }>) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.ok(), icon.src).toBe(true);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }

  const worker = await page.request.get("/sw.js");
  expect(worker.ok()).toBe(true);
  expect(worker.headers()["content-type"]).toContain("javascript");

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/site.webmanifest");
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.getByRole("button", { name: /Sign up/ })).toBeVisible();
  await captureScreenshot(page, testInfo, "pwa-installable-welcome");
});
