import { describe, expect, it } from "vitest";
import { authModeForPolicy, explicitSignInRoute, initialAuthMode } from "./auth-routing.js";

describe("mobile authentication routing", () => {
  it("defaults ordinary logged-out visitors to sign-up", () => {
    expect(initialAuthMode()).toBe("up");
  });

  it("sends signup visitors to sign-in when registration is closed", () => {
    expect(authModeForPolicy("up", false)).toBe("in");
    expect(authModeForPolicy("up", true)).toBe("up");
    expect(authModeForPolicy("in", false)).toBe("in");
    expect(authModeForPolicy("forgot", false)).toBe("forgot");
  });

  it("honors the explicit sign-in route used after logout", () => {
    expect(explicitSignInRoute).toEqual({ pathname: "/sign-in", params: { mode: "in" } });
    expect(initialAuthMode(explicitSignInRoute.params.mode)).toBe("in");
  });
});
