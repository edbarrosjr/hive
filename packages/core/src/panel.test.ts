import type { MessageBlock } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import {
  PANEL_ENVELOPE_KEY,
  panelAgeLabel,
  panelFromStructuredContent,
  panelToText,
} from "./panel.js";

type PanelBlock = Extract<MessageBlock, { kind: "panel" }>;

const calledAt = new Date("2026-09-21T12:00:00.000Z");
const now = new Date("2026-09-21T12:00:04.000Z");
const context = { key: "clave:venda:VENDA-123", source: "clave", calledAt, now };

const sections = [
  {
    section: "track",
    steps: [
      { label: "Proposta", state: "done" },
      { label: "Documentação", state: "done" },
      { label: "Crédito", state: "current" },
      { label: "Contrato", state: "pending" },
    ],
  },
  {
    section: "facts",
    rows: [
      { k: "O que falta", v: "Documento do cônjuge", tone: "attention" },
      { k: "Prazo da Caixa", v: "dia 4 de 10 úteis" },
    ],
  },
  { section: "note", text: "Dados de exemplo." },
];

function envelope(extra: Record<string, unknown> = {}) {
  return { [PANEL_ENVELOPE_KEY]: { title: "VENDA-123 · Ipanema", sections, ...extra } };
}

describe("panelFromStructuredContent", () => {
  it("builds a panel and stamps it with the server's clock", () => {
    const panel = panelFromStructuredContent(envelope(), context);

    expect(panel?.kind).toBe("panel");
    expect(panel?.v).toBe(1);
    expect(panel?.key).toBe("clave:venda:VENDA-123");
    expect(panel?.status).toBe("ready");
    expect(panel?.asOf).toBe(now.toISOString());
  });

  // A producer that could set its own freshness could make an hour-old answer
  // look current, which is the one lie this block exists to prevent.
  it("clamps a producer's claimed time into the window the call occupied", () => {
    const backwards = panelFromStructuredContent(
      envelope({ readAt: "2026-09-21T09:00:00.000Z" }),
      context,
    );
    const forwards = panelFromStructuredContent(
      envelope({ readAt: "2027-01-01T00:00:00.000Z" }),
      context,
    );
    const inside = panelFromStructuredContent(
      envelope({ readAt: "2026-09-21T12:00:02.000Z" }),
      context,
    );

    expect(backwards?.asOf).toBe(calledAt.toISOString());
    expect(forwards?.asOf).toBe(now.toISOString());
    expect(inside?.asOf).toBe("2026-09-21T12:00:02.000Z");
    expect(panelFromStructuredContent(envelope({ readAt: "ontem" }), context)?.asOf).toBe(
      now.toISOString(),
    );
  });

  it("declines anything that is not exactly the envelope", () => {
    expect(panelFromStructuredContent(undefined, context)).toBeUndefined();
    expect(panelFromStructuredContent({ other: {} }, context)).toBeUndefined();
    expect(panelFromStructuredContent({ [PANEL_ENVELOPE_KEY]: "texto" }, context)).toBeUndefined();
    expect(
      panelFromStructuredContent({ [PANEL_ENVELOPE_KEY]: { sections } }, context),
    ).toBeUndefined();
  });

  it("refuses a section shape it does not define", () => {
    expect(
      panelFromStructuredContent(
        { [PANEL_ENVELOPE_KEY]: { title: "X", sections: [{ section: "iframe", src: "//evil" }] } },
        context,
      ),
    ).toBeUndefined();
  });

  it("refuses more rows than the contract allows", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ k: `k${index}`, v: `v${index}` }));
    expect(
      panelFromStructuredContent(
        { [PANEL_ENVELOPE_KEY]: { title: "X", sections: [{ section: "facts", rows }] } },
        context,
      ),
    ).toBeUndefined();
  });
});

describe("panelToText", () => {
  it("derives the flat text from the sections rather than a second copy", () => {
    const panel = panelFromStructuredContent(envelope(), context) as PanelBlock;

    expect(panelToText(panel)).toBe(
      [
        "VENDA-123 · Ipanema",
        "Crédito (3/4)",
        "O que falta: Documento do cônjuge\nPrazo da Caixa: dia 4 de 10 úteis",
        "Dados de exemplo.",
      ].join("\n"),
    );
  });

  it("says something in every state, so no state renders as nothing", () => {
    const pending: PanelBlock = {
      kind: "panel",
      v: 1,
      key: "k",
      title: "Consultando a clave",
      status: "pending",
    };
    const failed: PanelBlock = { ...pending, status: "failed", error: "A clave não respondeu" };

    expect(panelToText(pending)).toBe("Consultando a clave");
    expect(panelToText(failed)).toBe("Consultando a clave — A clave não respondeu");
  });
});

describe("panelAgeLabel", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("stays quiet until the age is worth reading", () => {
    expect(panelAgeLabel(ago(60_000), now)).toBeUndefined();
    expect(panelAgeLabel(ago(14 * 60_000), now)).toBeUndefined();
    expect(panelAgeLabel(ago(15 * 60_000), now)).toBe("15 min");
  });

  it("climbs through minutes, hours and days", () => {
    expect(panelAgeLabel(ago(45 * 60_000), now)).toBe("45 min");
    expect(panelAgeLabel(ago(2 * 3_600_000), now)).toBe("2 h");
    expect(panelAgeLabel(ago(50 * 3_600_000), now)).toBe("2 d");
  });

  it("says nothing rather than guessing at a stamp it cannot read", () => {
    expect(panelAgeLabel(undefined, now)).toBeUndefined();
    expect(panelAgeLabel("ontem", now)).toBeUndefined();
  });
});
