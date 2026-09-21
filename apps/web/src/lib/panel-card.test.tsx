import type { MessageBlock } from "@rakazo/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PanelCard } from "../pages/shell/panel-card";

type PanelBlock = Extract<MessageBlock, { kind: "panel" }>;

const ready: PanelBlock = {
  kind: "panel",
  v: 1,
  key: "clave:venda:VENDA-123",
  title: "VENDA-123 · Ipanema",
  status: "ready",
  source: "clave",
  sections: [
    {
      section: "track",
      steps: [
        { label: "Proposta", state: "done" },
        { label: "Crédito", state: "current" },
        { label: "Contrato", state: "pending" },
      ],
    },
    {
      section: "facts",
      rows: [{ k: "O que falta", v: "Documento do cônjuge", tone: "attention" }],
    },
    { section: "note", text: "Dados de exemplo." },
  ],
};

describe("PanelCard", () => {
  it("draws every section the panel carries", () => {
    const html = renderToStaticMarkup(<PanelCard block={ready} />);

    expect(html).toContain("VENDA-123 · Ipanema");
    expect(html).toContain("Crédito");
    expect(html).toContain("O que falta");
    expect(html).toContain("Documento do cônjuge");
    expect(html).toContain("Dados de exemplo.");
  });

  // A producer supplies strings, never markup: the renderer puts them in text
  // nodes, so a server cannot reach the page through a panel.
  it("escapes what a producer wrote instead of rendering it", () => {
    const html = renderToStaticMarkup(
      <PanelCard
        block={{
          ...ready,
          title: "<img src=x onerror=alert(1)>",
          sections: [{ section: "facts", rows: [{ k: "k", v: "<script>alert(2)</script>" }] }],
        }}
      />,
    );

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x");
  });

  it("hides the age until it is worth reading, and shows it after", () => {
    const fresh = renderToStaticMarkup(
      <PanelCard block={{ ...ready, asOf: new Date(Date.now() - 60_000).toISOString() }} />,
    );
    const old = renderToStaticMarkup(
      <PanelCard block={{ ...ready, asOf: new Date(Date.now() - 7_200_000).toISOString() }} />,
    );

    expect(fresh).toContain("clave");
    expect(fresh).not.toContain(" h");
    expect(old).toContain("clave · 2 h");
  });

  it("says something while pending and when it failed", () => {
    const pending = renderToStaticMarkup(
      <PanelCard block={{ ...ready, status: "pending", sections: undefined }} />,
    );
    const failed = renderToStaticMarkup(
      <PanelCard
        block={{ ...ready, status: "failed", sections: undefined, error: "A clave não respondeu" }}
      />,
    );

    expect(pending).toContain('aria-busy="true"');
    expect(pending).toContain("VENDA-123 · Ipanema");
    expect(failed).toContain("A clave não respondeu");
  });
});
