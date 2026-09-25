import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SecretInput } from "./secret-input.js";

describe("SecretInput", () => {
  it("masks the value without inviting password managers to take the field over", () => {
    // React's server renderer keeps attribute casing; browsers lowercase it.
    const html = renderToString(
      <SecretInput aria-label="API key" placeholder="sk-…" />,
    ).toLowerCase();
    expect(html).toContain('type="password"');
    expect(html).toContain('autocomplete="off"');
    expect(html).toContain('autocapitalize="none"');
    expect(html).toContain('autocorrect="off"');
    expect(html).toContain('spellcheck="false"');
    expect(html).toContain("data-1p-ignore");
    expect(html).toContain('data-lpignore="true"');
    expect(html).not.toContain("new-password");
  });

  it("passes field props through", () => {
    const html = renderToString(<SecretInput id="token" placeholder="Optional" disabled />);
    expect(html).toContain('id="token"');
    expect(html).toContain('placeholder="Optional"');
    expect(html).toContain("disabled");
  });
});
