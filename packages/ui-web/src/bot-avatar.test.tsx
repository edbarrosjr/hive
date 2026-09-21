import { ACTIVE_RUN_STATUSES, CLAVE_AVATAR_BODY_PATH } from "@rakazo/core";
import { darkTokens } from "@rakazo/ui-tokens";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BotAvatar,
  DEFAULT_GROK_BOT_COLOR,
  GROK_BOT_COLORS,
  GrokShapePreview,
  parseBotAvatar,
  resolvePersonaColorDef,
  resolvePersonaShape,
} from "./bot-avatar.js";

describe("BotAvatar", () => {
  it("renders the flat Clave mascot without gradients or shadows", () => {
    const html = renderToString(
      <div>
        <BotAvatar color="#8B5CF6" status="running" />
        <BotAvatar color="#10B981" status="running" />
      </div>,
    );
    expect(html.match(/data-mascot="clave"/g)).toHaveLength(2);
    expect(html).toContain(CLAVE_AVATAR_BODY_PATH);
    expect(html).not.toContain("linearGradient");
    expect(html).not.toContain("drop-shadow");
  });

  it.each([...ACTIVE_RUN_STATUSES])("marks active run status %s as working", (status) => {
    const html = renderToString(<BotAvatar color="#3B82F6" status={status} />);
    expect(html).toContain("<svg");
    expect(html).toContain('data-working="true"');
    expect(html).toContain('data-expression="working"');
  });

  it("keeps working attribute false when idle", () => {
    const html = renderToString(<BotAvatar color="#F59E0B" status="idle" />);
    expect(html).toContain('data-working="false"');
  });

  it("renders a geometric mascot for plain color values", () => {
    const html = renderToString(
      <BotAvatar color="#D9508A" identity="maya" size={28} status="running" />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
    expect(html).toContain("<rect");
    expect(html).toContain('data-working="true"');
  });

  it("keeps one silhouette for distinct bot identities", () => {
    const maya = renderToString(<BotAvatar color="#D9508A" identity="maya" />);
    const github = renderToString(<BotAvatar color="#D9508A" identity="github" />);
    expect(maya).toEqual(github);
    expect(resolvePersonaShape("maya")).toBe(CLAVE_AVATAR_BODY_PATH);
    expect(resolvePersonaShape("github")).toBe(CLAVE_AVATAR_BODY_PATH);
  });

  it("parses shape indexes from encoded color values", () => {
    const parsed = parseBotAvatar(`${DEFAULT_GROK_BOT_COLOR}::shape_3`);
    expect(parsed.color).toBe(DEFAULT_GROK_BOT_COLOR);
    expect(parsed.shapeIndex).toBe(3);
    expect(parsed.isImage).toBe(false);
  });

  it("normalizes malformed shape suffixes to shape 0", () => {
    expect(parseBotAvatar(`${DEFAULT_GROK_BOT_COLOR}::shape_-1`).shapeIndex).toBe(0);
    expect(parseBotAvatar(`${DEFAULT_GROK_BOT_COLOR}::shape_3junk`).shapeIndex).toBe(0);
    expect(parseBotAvatar(`${DEFAULT_GROK_BOT_COLOR}::shape_`).shapeIndex).toBe(0);
  });

  it("exposes the violet identity color as the shared default", () => {
    expect(GROK_BOT_COLORS).toContain(DEFAULT_GROK_BOT_COLOR);
    expect(parseBotAvatar(`${DEFAULT_GROK_BOT_COLOR}::shape_0`).color).toBe(DEFAULT_GROK_BOT_COLOR);
  });

  it("resolves explicit colors and shapes", () => {
    expect(resolvePersonaColorDef("bot", "#10B981").hex.toLowerCase()).toBe("#10b981");
    expect(resolvePersonaColorDef("bot", "#fff").hex).toBe("#fff");
    expect(resolvePersonaShape("bot", "hex")).toBe(CLAVE_AVATAR_BODY_PATH);
    expect(GROK_BOT_COLORS.length).toBeGreaterThan(0);
  });

  it("falls back to the identity palette for invalid custom hex", () => {
    expect(resolvePersonaColorDef("bot", "#zzzzzz")).toEqual(resolvePersonaColorDef("bot"));
    expect(resolvePersonaColorDef("bot", "#ggg")).toEqual(resolvePersonaColorDef("bot"));
  });

  it("uses the fixed mascot for legacy image avatars without modifying their stored value", () => {
    const html = renderToString(
      <BotAvatar color="data:image/png;base64,abc" identity="maya" size={32} />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain(CLAVE_AVATAR_BODY_PATH);
    expect(html).not.toContain("grok-character-eyes");
  });

  it("does not treat arbitrary http(s) color values as remote images", () => {
    const parsed = parseBotAvatar("https://evil.example/track.png");
    expect(parsed.isImage).toBe(false);
    expect(parsed.imageUrl).toBeUndefined();
    const html = renderToString(
      <BotAvatar color="https://evil.example/track.png" identity="maya" size={32} />,
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("evil.example");
  });

  it("exposes the body and eyes to the shared motion controller", () => {
    const html = renderToString(
      <BotAvatar color="#8B5CF6" identity="maya" size={32} status="running" />,
    );
    expect(html).toContain('class="clave-avatar-body"');
    expect(html).toContain('class="clave-avatar-character"');
    expect(html).toContain('class="clave-avatar-eyes"');
    expect(html).not.toContain("animate-pulse");
  });

  it("keeps orange fixed while persisting eye-only identity", () => {
    const html = renderToString(<BotAvatar color="clave::eyes_#312E81" />);
    expect(html).toContain(`fill="${darkTokens.mascotBody}"`);
    expect(html).toContain('class="clave-avatar-eyes" fill="#312E81"');
    const legacy = renderToString(<BotAvatar color="#10B981" />);
    expect(legacy).toContain(`fill="${darkTokens.mascotBody}"`);
    expect(legacy).not.toContain('fill="#10B981"');
  });

  it("supports explicit eye-only expressions", () => {
    const html = renderToString(<BotAvatar color="#8B5CF6" expression="thinking" status="idle" />);
    expect(html).toContain('data-expression="thinking"');
    expect(html).toContain("clave-avatar-eye-left");
    expect(html).toContain("clave-avatar-eye-right");
  });

  it("keeps the legacy preview API on the Clave silhouette", () => {
    const html = renderToString(
      <GrokShapePreview shapeIndex={0} color="#8B5CF6" selected onClick={() => undefined} />,
    );
    expect(html).toContain('aria-label="clave"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("focus-visible:ring-2");
  });
});
