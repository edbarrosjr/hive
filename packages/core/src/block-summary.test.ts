import { describe, expect, it } from "vitest";
import { unknownBlockSummary } from "./block-summary.js";

describe("unknownBlockSummary", () => {
  it("reads the conventional display fields in order", () => {
    expect(unknownBlockSummary({ kind: "meta", text: "Renamed the bot" })).toBe("Renamed the bot");
    expect(unknownBlockSummary({ kind: "computer", state: "Needs you" })).toBe("Needs you");
    expect(unknownBlockSummary({ kind: "choice", question: "Which one?" })).toBe("Which one?");
    expect(unknownBlockSummary({ kind: "connect", name: "Gmail" })).toBe("Gmail");
  });

  // The point of the fallback: a kind nobody has written a renderer for still
  // leaves a line, so the bubble around it never collapses.
  it("summarises a kind this build has never seen", () => {
    expect(unknownBlockSummary({ kind: "panel", title: "VENDA-123 · Ipanema" })).toBe(
      "VENDA-123 · Ipanema",
    );
    expect(unknownBlockSummary({ kind: "some_future_kind" })).toBe("some future kind");
  });

  it("never offers an id as a summary", () => {
    expect(
      unknownBlockSummary({ kind: "skill_draft", name: "0f9c4e62-1d3a-4b55-9f21-7c8e5a2b1d44" }),
    ).toBe("skill draft");
    expect(unknownBlockSummary({ kind: "x", name: "a".repeat(32) })).toBe("x");
  });

  it("caps a long field instead of pasting an essay into a bubble", () => {
    const summary = unknownBlockSummary({ kind: "text", text: "palavra ".repeat(60) });
    expect(summary?.length).toBe(140);
    expect(summary?.endsWith("…")).toBe(true);
  });

  it("returns nothing for a block that carries nothing to read", () => {
    expect(unknownBlockSummary({ kind: "", lines: [] })).toBeUndefined();
    expect(unknownBlockSummary(null)).toBeUndefined();
    expect(unknownBlockSummary("not a block")).toBeUndefined();
  });
});
