export type AuthMode = "in" | "up" | "forgot";

export const explicitSignInRoute = {
  pathname: "/sign-in",
  params: { mode: "in" },
} as const;

export function initialAuthMode(requestedMode?: string | string[]): AuthMode {
  return requestedMode === "in" ? "in" : "up";
}

/** Closed registration leaves sign-in as the only place a signup visitor can go. */
export function authModeForPolicy(mode: AuthMode, signupsOpen: boolean): AuthMode {
  return mode === "up" && !signupsOpen ? "in" : mode;
}
