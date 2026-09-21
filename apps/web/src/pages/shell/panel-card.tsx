import type { MessageBlock } from "@rakazo/contracts";
import { panelAgeLabel } from "@rakazo/core";
import { BuiCard } from "../../components/ai/primitives";

const PANEL_TONE = {
  neutral: "text-foreground",
  ok: "text-success",
  attention: "text-warning",
  risk: "text-destructive",
} as const;

const TRACK_STATE = {
  done: "bg-foreground",
  current: "bg-foreground",
  pending: "bg-border",
  blocked: "bg-destructive",
  skipped: "bg-border",
} as const;

/**
 * A panel the backend built from a tool's structured result.
 *
 * Nothing here is authored by the model, and nothing carries a colour, a URL or
 * markup: every string arrives as a text node, and tone is a token rather than
 * a value a producer picked. The age line appears only past a threshold — below
 * it the reader learns nothing from "just now", and the AGENTS.md rule about
 * status chrome applies.
 */
export function PanelCard({ block }: { block: Extract<MessageBlock, { kind: "panel" }> }) {
  const age = panelAgeLabel(block.asOf, new Date());

  return (
    <BuiCard className="max-w-[74%] p-0">
      <div className="flex items-baseline justify-between gap-4 px-[18px] pb-3.5 pt-4">
        <span className="text-[15.5px] font-medium text-foreground">{block.title}</span>
        {block.source || age ? (
          <span className="shrink-0 text-[12px] text-muted-foreground">
            {[block.source, age].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>

      {block.status === "pending" ? (
        <div className="flex flex-col gap-1.5 px-[18px] pb-4" aria-busy="true">
          <span className="h-2 w-[62%] rounded-full bg-muted" />
          <span className="h-2 w-[38%] rounded-full bg-muted" />
        </div>
      ) : null}

      {block.status === "failed" && block.error ? (
        <p className="px-[18px] pb-4 text-[14px] leading-[1.5] text-foreground/80">{block.error}</p>
      ) : null}

      {(block.sections ?? []).map((section, index) => {
        if (section.section === "track") {
          return (
            <div key={`track-${index}`} className="flex gap-0.5 px-[18px] pb-[18px]">
              {section.steps.map((step) => (
                <div key={step.label} className="flex min-w-0 grow flex-col gap-[7px]">
                  <span className={`h-[3px] rounded-full ${TRACK_STATE[step.state]}`} />
                  <span
                    className={`truncate text-[11.5px] ${
                      step.state === "current"
                        ? "font-medium text-foreground"
                        : step.state === "done"
                          ? "text-foreground/75"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          );
        }

        if (section.section === "facts") {
          return (
            <dl key={`facts-${index}`} className="border-t border-border/60 px-[18px] py-1">
              {section.rows.map((row) => (
                <div key={row.k} className="flex items-baseline gap-4 py-[9px]">
                  <dt className="w-[150px] shrink-0 text-[13px] text-muted-foreground">{row.k}</dt>
                  <dd
                    className={`min-w-0 grow text-[14px] ${PANEL_TONE[row.tone ?? "neutral"]} ${
                      row.tone && row.tone !== "neutral" ? "font-medium" : ""
                    }`}
                  >
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
          );
        }

        return (
          <p
            key={`note-${index}`}
            className="px-[18px] pb-3.5 pt-2.5 text-[12px] leading-[1.45] text-muted-foreground"
          >
            {section.text}
          </p>
        );
      })}
    </BuiCard>
  );
}
