import { describe, expect, it } from "vitest";
import { type ServiceWorkerEnvironment, shouldRegisterServiceWorker } from "./pwa";

const installable: ServiceWorkerEnvironment = {
  production: true,
  desktop: false,
  secureContext: true,
  supported: true,
};

describe("shouldRegisterServiceWorker", () => {
  it("registers on a production browser page over a secure origin", () => {
    expect(shouldRegisterServiceWorker(installable)).toBe(true);
  });

  it("stays out of the dev server so its modules are never cached", () => {
    expect(shouldRegisterServiceWorker({ ...installable, production: false })).toBe(false);
  });

  it("stays out of the Electron host", () => {
    expect(shouldRegisterServiceWorker({ ...installable, desktop: true })).toBe(false);
  });

  it("skips insecure origins and browsers without service workers", () => {
    expect(shouldRegisterServiceWorker({ ...installable, secureContext: false })).toBe(false);
    expect(shouldRegisterServiceWorker({ ...installable, supported: false })).toBe(false);
  });
});
