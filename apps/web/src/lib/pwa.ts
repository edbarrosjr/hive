import { desktopBridge } from "./desktop";

export interface ServiceWorkerEnvironment {
  /** Production builds only: the dev server serves modules that must never be cached. */
  production: boolean;
  /** Electron hosts the same UI but ships its own updater and has no install prompt. */
  desktop: boolean;
  /** Browsers register service workers only on HTTPS or loopback origins. */
  secureContext: boolean;
  supported: boolean;
}

export function shouldRegisterServiceWorker(env: ServiceWorkerEnvironment): boolean {
  return env.production && !env.desktop && env.secureContext && env.supported;
}

/** Registers the app-shell service worker after the page has loaded, when the surface allows it. */
export function registerServiceWorker(target: Window = window): void {
  const supported = "serviceWorker" in target.navigator;
  const environment: ServiceWorkerEnvironment = {
    production: import.meta.env.PROD,
    desktop: desktopBridge() !== undefined,
    secureContext: target.isSecureContext,
    supported,
  };
  if (!shouldRegisterServiceWorker(environment)) return;
  target.addEventListener(
    "load",
    () => {
      void target.navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    },
    { once: true },
  );
}
