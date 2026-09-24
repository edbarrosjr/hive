import { readBoundedJsonResponse } from "@rakazo/core";
import { useEffect, useState } from "react";

export type AuthCapabilities = {
  signups: boolean;
  passwordReset: boolean;
  resetUrl: string | null;
};

const AUTH_CAPABILITIES_TIMEOUT_MS = 8_000;
const MAX_AUTH_CAPABILITIES_RESPONSE_BYTES = 64 * 1024;

/** What an unreachable or malformed answer falls back to: the pre-existing open behavior. */
export const DEFAULT_AUTH_CAPABILITIES: AuthCapabilities = {
  signups: true,
  passwordReset: false,
  resetUrl: null,
};

/** Servers that predate the `signups` field keep registration open. */
export function parseAuthCapabilities(body: unknown): AuthCapabilities {
  if (!body || typeof body !== "object") return DEFAULT_AUTH_CAPABILITIES;
  const raw = body as Record<string, unknown>;
  return {
    signups: raw.signups !== false,
    passwordReset: raw.passwordReset === true,
    resetUrl: typeof raw.resetUrl === "string" ? raw.resetUrl : null,
  };
}

export async function fetchAuthCapabilities(signal: AbortSignal): Promise<AuthCapabilities> {
  const response = await fetch("/api/auth/capabilities", { signal });
  if (!response.ok) throw new Error("Could not load authentication capabilities");
  return parseAuthCapabilities(
    await readBoundedJsonResponse<unknown>(response, MAX_AUTH_CAPABILITIES_RESPONSE_BYTES, signal),
  );
}

/** `null` while loading; a failed lookup resolves to the open defaults. */
export function useAuthCapabilities(): AuthCapabilities | null {
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AUTH_CAPABILITIES_TIMEOUT_MS);
    void fetchAuthCapabilities(controller.signal)
      .catch(() => DEFAULT_AUTH_CAPABILITIES)
      .then((loaded) => {
        if (active) setCapabilities(loaded);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  return capabilities;
}
