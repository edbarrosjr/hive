import { describe, expect, it } from "vitest";
import { DEFAULT_AUTH_CAPABILITIES, parseAuthCapabilities } from "./auth-capabilities";

describe("auth capabilities", () => {
  it("reports closed registration only when the server says so", () => {
    expect(parseAuthCapabilities({ signups: false, passwordReset: false, resetUrl: null })).toEqual(
      { signups: false, passwordReset: false, resetUrl: null },
    );
    expect(
      parseAuthCapabilities({ signups: true, passwordReset: true, resetUrl: "https://x/reset" }),
    ).toEqual({ signups: true, passwordReset: true, resetUrl: "https://x/reset" });
  });

  it("keeps registration open for servers without the signups field", () => {
    expect(parseAuthCapabilities({ passwordReset: false, resetUrl: null }).signups).toBe(true);
  });

  it("falls back to the open defaults on malformed bodies", () => {
    for (const body of [null, undefined, "x", 3, []]) {
      expect(parseAuthCapabilities(body)).toEqual(DEFAULT_AUTH_CAPABILITIES);
    }
    expect(parseAuthCapabilities({ signups: "no", resetUrl: 4 })).toEqual({
      signups: true,
      passwordReset: false,
      resetUrl: null,
    });
  });
});
