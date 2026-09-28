import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { closeUnterminatedFence, sanitizeMarkdownUrl } from "./markdown";

// The package root imports React Native, which does not load in a node test, so
// the parser is reached through its compiled modules instead.
const load = createRequire(import.meta.url);
const nativeView = "@ronradtke/react-native-markdown-display/dist/lib/view";
const { createMarkdownIt } = load(`${nativeView}/createMarkdownIt.js`);
const { stringToTokens } = load(`${nativeView}/util/stringToTokens.js`);
const tokensToAST = load(`${nativeView}/util/tokensToAST.js`).default;

function nativeNodeTypes(markdown: string): Set<string> {
  const types = new Set<string>();
  const walk = (nodes: Array<{ type: string; children?: unknown[] }>) => {
    for (const node of nodes) {
      types.add(node.type);
      if (Array.isArray(node.children)) {
        walk(node.children as Array<{ type: string; children?: unknown[] }>);
      }
    }
  };
  walk(tokensToAST(stringToTokens(markdown, createMarkdownIt())));
  return types;
}

describe("sanitizeMarkdownUrl", () => {
  it("allows normal external links and optionally allows local links", () => {
    expect(sanitizeMarkdownUrl("https://example.com/docs")).toBe("https://example.com/docs");
    expect(sanitizeMarkdownUrl("mailto:hello@example.com")).toBe("mailto:hello@example.com");
    expect(sanitizeMarkdownUrl("/docs", true)).toBe("/docs");
    expect(sanitizeMarkdownUrl("#section", true)).toBe("#section");
  });

  it("rejects executable and embedded-data URLs", () => {
    expect(sanitizeMarkdownUrl("javascript:alert(1)", true)).toBeUndefined();
    expect(sanitizeMarkdownUrl("data:text/html,<script>alert(1)</script>", true)).toBeUndefined();
    expect(sanitizeMarkdownUrl("/docs")).toBeUndefined();
  });
});

describe("closeUnterminatedFence", () => {
  it("temporarily closes a partial streaming code fence", () => {
    expect(closeUnterminatedFence("Before\n```ts\nconst value = 1;")).toBe(
      "Before\n```ts\nconst value = 1;\n```",
    );
  });

  it("leaves complete markdown unchanged", () => {
    const markdown = "```ts\nconst value = 1;\n```\n\nDone";
    expect(closeUnterminatedFence(markdown)).toBe(markdown);
  });
});

describe("native markdown tables", () => {
  // The web renderer gets tables from remark-gfm; the native one gets them from
  // markdown-it's default preset. Nothing in this package configures either, so
  // this is the test that says the two surfaces still agree.
  it("parses a GFM table into every node type the renderer draws", () => {
    const types = nativeNodeTypes(
      ["| Etapa | Estado |", "| --- | --- |", "| Credito | em analise |"].join("\n"),
    );

    for (const type of ["table", "thead", "tbody", "tr", "th", "td"]) {
      expect(types.has(type)).toBe(true);
    }
  });

  it("leaves a table that is missing its delimiter row as plain text", () => {
    const types = nativeNodeTypes("| Etapa | Estado |\n| Credito | em analise |");

    expect(types.has("table")).toBe(false);
    expect(types.has("paragraph")).toBe(true);
  });
});
